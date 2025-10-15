import { screen, type IpcMainInvokeEvent } from 'electron';

import { Handler, Service } from '@/shared/decorators';
import { getLoggerBy } from '@/shared/logging/helpers';
import { GLOBAL_EVENTS } from '@/shared/types/event';
import { getTitlebarView } from '@/shared/types/view';
import { eventEmitterService } from '../events/broadcaster';
import { shellWindowService } from './shell-window-service';

const logger = getLoggerBy('service', 'ghost-window-service');

interface InsertTarget {
  windowId: string;
  insertIndex: number;
  [key: string]: unknown;
}

@Service
export class GhostWindowService {
  private updateInterval: NodeJS.Timeout | null = null;
  private lastPointerPosition: { x: number; y: number } | null = null;
  private currentHoveredWindowId: string | null = null;
  private currentInsertTarget: InsertTarget | null = null;

  @Handler
  async startTracking(_event: IpcMainInvokeEvent): Promise<void> {
    logger.info('Starting mouse tracking for drag operation');

    try {
      // Get current cursor position
      const cursorPos = screen.getCursorScreenPoint();
      this.lastPointerPosition = { x: cursorPos.x, y: cursorPos.y };

      // Start polling
      this.startPolling();

      logger.debug('Mouse tracking started at ({x}, {y})', { x: cursorPos.x, y: cursorPos.y });
    } catch (error) {
      logger.error('Failed to start tracking: {error}', { error });
      throw error;
    }
  }

  @Handler
  async stopTracking(): Promise<void> {
    logger.info('Stopping mouse tracking');

    this.stopPolling();

    // Clear any hover state
    if (this.currentHoveredWindowId) {
      this.clearHoverState(this.currentHoveredWindowId);
    }

    this.lastPointerPosition = null;
    this.currentHoveredWindowId = null;
    this.currentInsertTarget = null;

    logger.debug('Mouse tracking stopped');
  }

  @Handler
  async updateInsertIndex(_event: IpcMainInvokeEvent, target: InsertTarget): Promise<void> {
    this.currentInsertTarget = target;
    logger.debug('Updated insert target to window {windowId} at index {index}', {
      windowId: target.windowId,
      index: target.insertIndex
    });
  }

  /**
   * Internal synchronous method for backend services.
   * Called by dropAtPointer before stopTracking() clears the target.
   */
  getCurrentInsertTargetSync(): InsertTarget | null {
    return this.currentInsertTarget;
  }

  private startPolling(): void {
    if (this.updateInterval) {
      return;
    }

    // Poll at 60Hz
    this.updateInterval = setInterval(() => {
      this.updateMousePosition();
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

  private updateMousePosition(): void {
    // Get current cursor position
    const cursorPos = screen.getCursorScreenPoint();

    // Only update if position changed
    if (this.lastPointerPosition && cursorPos.x === this.lastPointerPosition.x && cursorPos.y === this.lastPointerPosition.y) {
      return;
    }

    this.lastPointerPosition = { x: cursorPos.x, y: cursorPos.y };

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
      draggedWidth: 120 // Default width for indicator calculation
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
