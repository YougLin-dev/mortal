import { BrowserWindow, nativeTheme, screen, type IpcMainInvokeEvent } from 'electron';

import { Handler, Service } from '@/shared/decorators';
import { getLoggerBy } from '@/shared/logging/helpers';
import { GLOBAL_EVENTS } from '@/shared/types/event';
import { getTitlebarView } from '@/shared/types/view';
import { getRealAppWindows, markGhostWindow } from '@/main/utils/window-utils';
import { eventEmitterService } from '../events/broadcaster';
import { shellWindowService } from './shell-window-service';

const logger = getLoggerBy('service', 'ghost-window-service');

interface GhostStartPayload {
  tabName: string;
  [key: string]: unknown;
}

interface InsertTarget {
  windowId: string;
  insertIndex: number;
  [key: string]: unknown;
}

@Service
export class GhostWindowService {
  private ghostWindow: BrowserWindow | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastPointerPosition: { x: number; y: number } | null = null;
  private currentHoveredWindowId: string | null = null;
  private currentInsertTarget: InsertTarget | null = null;
  private draggedWidth: number = 0;

  private createGhostWindow(): BrowserWindow {
    logger.debug('Creating ghost window');

    const win = new BrowserWindow({
      width: 120,
      height: 32,
      frame: false,
      transparent: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      focusable: false,
      minimizable: false,
      maximizable: false,
      backgroundColor: '#00000000',
      show: false,
      useContentSize: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Mark as ghost window using type-safe WeakSet
    markGhostWindow(win);

    win.setAlwaysOnTop(true, 'floating');
    win.setIgnoreMouseEvents(true, { forward: true });
    win.setResizable(false);

    return win;
  }

  private ensureGhostWindow(): BrowserWindow {
    if (!this.ghostWindow || this.ghostWindow.isDestroyed()) {
      this.ghostWindow = this.createGhostWindow();
    }
    return this.ghostWindow;
  }

  @Handler
  async start(_event: IpcMainInvokeEvent, payload: GhostStartPayload): Promise<void> {
    logger.info('Starting ghost window');

    try {
      const { tabName } = payload;

      // Fixed small size for ghost indicator
      const ghostWidth = 120;
      const ghostHeight = 32;
      this.draggedWidth = ghostWidth;

      // Ensure ghost window exists
      const ghost = this.ensureGhostWindow();

      // Simple text indicator HTML using app's tabbar colors
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { 
                width: 120px;
                height: 32px;
                overflow: hidden;
              }
              body { 
                background: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              }
              body.dark {
                background: #3c3c3c;
              }
              .text {
                color: #1f1f1f;
                font-size: 13px;
                font-weight: 500;
                padding: 0 12px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
              }
              body.dark .text {
                color: #e3e3e3;
              }
            </style>
          </head>
          <body class="${nativeTheme.shouldUseDarkColors ? 'dark' : ''}">
            <div class="text">${tabName}</div>
          </body>
        </html>
      `;

      await ghost.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      // Get current cursor position
      const cursorPos = screen.getCursorScreenPoint();
      this.lastPointerPosition = { x: cursorPos.x, y: cursorPos.y };

      // Position the ghost window at cursor (centered)
      ghost.setPosition(cursorPos.x - ghostWidth / 2, cursorPos.y - ghostHeight / 2);
      ghost.show();

      // Start polling
      this.startPolling();

      logger.debug('Ghost window started successfully at ({x}, {y})', {
        x: cursorPos.x - ghostWidth / 2,
        y: cursorPos.y - ghostHeight / 2
      });
    } catch (error) {
      logger.error('Failed to start ghost window: {error}', { error });
      throw error;
    }
  }

  @Handler
  async stop(): Promise<void> {
    logger.info('Stopping ghost window');

    this.stopPolling();

    // Clear any hover state
    if (this.currentHoveredWindowId) {
      this.clearHoverState(this.currentHoveredWindowId);
    }

    if (this.ghostWindow && !this.ghostWindow.isDestroyed()) {
      this.ghostWindow.hide();

      // If no real app windows remain, destroy ghost to allow window-all-closed to fire
      if (getRealAppWindows().length === 0) {
        logger.debug('No real app windows remain, destroying ghost window');
        this.ghostWindow.destroy();
        this.ghostWindow = null;
      }
    }

    this.lastPointerPosition = null;
    this.currentHoveredWindowId = null;
    this.currentInsertTarget = null;
    this.draggedWidth = 0;

    logger.debug('Ghost window stopped');
  }

  @Handler
  async updateInsertIndex(_event: IpcMainInvokeEvent, target: InsertTarget): Promise<void> {
    this.currentInsertTarget = target;
    logger.debug('Updated insert target to window {windowId} at index {index}', {
      windowId: target.windowId,
      index: target.insertIndex
    });
  }

  getCurrentInsertTarget(): InsertTarget | null {
    return this.currentInsertTarget;
  }

  private startPolling(): void {
    if (this.updateInterval) {
      return;
    }

    // Poll at 60Hz
    this.updateInterval = setInterval(() => {
      this.updateGhostPosition();
    }, 1000 / 60);

    logger.debug('Started polling at 60Hz');
  }

  private stopPolling(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.debug('Stopped polling');
    }
  }

  private updateGhostPosition(): void {
    if (!this.ghostWindow || this.ghostWindow.isDestroyed()) {
      this.stopPolling();
      return;
    }

    // Get current cursor position
    const cursorPos = screen.getCursorScreenPoint();

    // Only update if position changed
    if (this.lastPointerPosition && cursorPos.x === this.lastPointerPosition.x && cursorPos.y === this.lastPointerPosition.y) {
      return;
    }

    this.lastPointerPosition = { x: cursorPos.x, y: cursorPos.y };

    // Update ghost window position
    const currentBounds = this.ghostWindow.getBounds();
    this.ghostWindow.setBounds({
      ...currentBounds,
      x: cursorPos.x - currentBounds.width / 2,
      y: cursorPos.y - currentBounds.height / 2
    });

    // Find window at cursor position
    const targetWindowData = shellWindowService.findWindowAtPoint(cursorPos.x, cursorPos.y);

    if (targetWindowData) {
      const { win: targetWindow, windowId: targetWindowId } = targetWindowData;

      // Check if pointer is in titlebar
      if (shellWindowService.isPointInTitlebar(targetWindow, cursorPos.x, cursorPos.y)) {
        // Convert to client coordinates
        const windowBounds = targetWindow.getBounds();
        const clientX = cursorPos.x - windowBounds.x;
        const clientY = cursorPos.y - windowBounds.y;

        // Send hover event to titlebar
        if (this.currentHoveredWindowId !== targetWindowId) {
          // Clear previous hover state
          if (this.currentHoveredWindowId) {
            this.clearHoverState(this.currentHoveredWindowId);
          }
          this.currentHoveredWindowId = targetWindowId;
        }

        this.sendHoverEvent(targetWindowId, clientX, clientY);
        return;
      }
    }

    // No valid target, clear hover state
    if (this.currentHoveredWindowId) {
      this.clearHoverState(this.currentHoveredWindowId);
      this.currentHoveredWindowId = null;
    }
  }

  private sendHoverEvent(windowId: string, clientX: number, clientY: number): void {
    const targetWindow = shellWindowService.getWindowById(windowId);
    if (!targetWindow) return;

    const titlebarView = getTitlebarView(targetWindow);
    if (!titlebarView || titlebarView.webContents.isDestroyed()) return;

    eventEmitterService.emitTo(titlebarView.webContents.id, GLOBAL_EVENTS.TAB_DRAG_GHOST_HOVER, {
      clientX,
      clientY,
      draggedWidth: this.draggedWidth
    });
  }

  private clearHoverState(windowId: string): void {
    const targetWindow = shellWindowService.getWindowById(windowId);
    if (!targetWindow) return;

    const titlebarView = getTitlebarView(targetWindow);
    if (!titlebarView || titlebarView.webContents.isDestroyed()) return;

    eventEmitterService.emitTo(titlebarView.webContents.id, GLOBAL_EVENTS.TAB_DRAG_GHOST_CLEAR, {});
  }
}

export const ghostWindowService = new GhostWindowService();
