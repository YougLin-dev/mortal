import type { InternalWindowState, WindowState } from '@/shared/types/window';
import type { BaseWindow } from 'electron';
import { screen } from 'electron';
import { storage } from '@/main/core/storage/config';
import { STORAGES } from '@/shared/types/storage-key';
import { getLoggerBy } from '@/shared/logging/helpers';

const logger = getLoggerBy('service', 'window', 'state');

export interface WindowStateManagerOptions {
  windowId: string;
  defaultState?: Partial<WindowState>;
  restoreMaximized?: boolean;
  restoreFullScreen?: boolean;
}

export class WindowStateManager {
  private static instances = new Set<WindowStateManager>();

  private state: InternalWindowState;
  private winRef: BaseWindow | null = null;
  private stateChangeTimer: NodeJS.Timeout | null = null;
  private readonly eventHandlingDelay = 100;
  private readonly storageKey: `app:windows:${string}`;
  private options: WindowStateManagerOptions;

  constructor(userOptions: WindowStateManagerOptions) {
    this.options = userOptions;
    this.storageKey = STORAGES.APP_WINDOWS(userOptions.windowId);
    const defaults = userOptions.defaultState || {};
    this.state = {
      windowId: userOptions.windowId,
      width: defaults.width ?? 800,
      height: defaults.height ?? 600,
      x: defaults.x,
      y: defaults.y,
      isMaximized: defaults.isMaximized ?? false,
      isMinimized: defaults.isMinimized ?? false,
      isFullScreen: defaults.isFullScreen ?? false,
      type: defaults.type ?? 'main',
      isAlwaysOnTop: defaults.isAlwaysOnTop ?? false,
      tabs: defaults.tabs ?? []
    };
    WindowStateManager.instances.add(this);
    this.initialize();
  }

  private initialize(): void {
    try {
      const savedState = storage.getItemSync(this.storageKey);
      if (savedState) {
        this.state = { ...this.state, ...savedState };
        this.validateState();
      }
    } catch (error) {
      logger.warn('Failed to load window state, windowId = {windowId}, error = {error}', { windowId: this.options.windowId, error });
    }
  }

  private isNormal(win: BaseWindow): boolean {
    return !win.isMaximized() && !win.isMinimized() && !win.isFullScreen();
  }

  private hasBounds(): boolean {
    return (
      this.state &&
      Number.isInteger(this.state.x) &&
      Number.isInteger(this.state.y) &&
      Number.isInteger(this.state.width) &&
      this.state.width > 0 &&
      Number.isInteger(this.state.height) &&
      this.state.height > 0
    );
  }

  private resetToDefault(): void {
    const primary = screen.getPrimaryDisplay();
    const work = primary.workArea;
    const defaults = this.options.defaultState || {};
    const width = defaults.width || 800;
    const height = defaults.height || 600;
    this.state = {
      ...this.state,
      width,
      height,
      x: Math.floor(work.x + (work.width - width) / 2),
      y: Math.floor(work.y + (work.height - height) / 2),
      displayBounds: primary.bounds
    };
  }

  private windowWithinBounds(bounds: Electron.Rectangle): boolean {
    return (
      this.state.x! >= bounds.x &&
      this.state.y! >= bounds.y &&
      this.state.x! + this.state.width <= bounds.x + bounds.width &&
      this.state.y! + this.state.height <= bounds.y + bounds.height
    );
  }

  private getTargetDisplay(): Electron.Display {
    const displays = screen.getAllDisplays();

    if (this.state.displayId != null) {
      const byId = displays.find((d) => d.id === this.state.displayId);
      if (byId) return byId;
    }

    if (Number.isInteger(this.state.x) && Number.isInteger(this.state.y)) {
      return screen.getDisplayNearestPoint({ x: this.state.x!, y: this.state.y! });
    }

    return screen.getPrimaryDisplay();
  }

  private ensureWindowVisibleOnSomeDisplay(): void {
    const visible = screen.getAllDisplays().some((display) => {
      return this.windowWithinBounds(display.workArea);
    });

    if (!visible) {
      const target = this.getTargetDisplay();
      const work = target.workArea;
      this.state.x = Math.max(work.x, Math.floor(work.x + (work.width - this.state.width) / 2));
      this.state.y = Math.max(work.y, Math.floor(work.y + (work.height - this.state.height) / 2));
    }
  }

  private validateState(): void {
    const isValid = this.state && (this.hasBounds() || this.state.isMaximized || this.state.isFullScreen);
    if (!isValid) {
      this.resetToDefault();
      return;
    }

    if (this.hasBounds() && this.state.displayBounds) {
      this.ensureWindowVisibleOnSomeDisplay();
    }
  }

  private updateState(win?: BaseWindow): void {
    const window = win || this.winRef;
    if (!window) return;

    try {
      const winBounds = window.getBounds();
      if (this.isNormal(window)) {
        this.state.x = winBounds.x;
        this.state.y = winBounds.y;
        this.state.width = winBounds.width;
        this.state.height = winBounds.height;
      }
      this.state.isAlwaysOnTop = window.isAlwaysOnTop();
      this.state.isMaximized = window.isMaximized();
      this.state.isFullScreen = window.isFullScreen();

      const display = screen.getDisplayMatching(winBounds);
      this.state.displayBounds = display.bounds;
      this.state.displayId = display.id;
    } catch (error) {
      logger.warn('Failed to update window state: {error}', { error });
    }
  }

  private saveState(win?: BaseWindow): void {
    if (win) {
      this.updateState(win);
    }

    try {
      const persistedState = storage.getItemSync(this.storageKey) ?? undefined;
      const nextState: InternalWindowState = {
        ...(persistedState ?? {}),
        ...this.state,
        // merge tabs state(changing in renderer), because tabs state will be overwritten by the window state
        tabs: persistedState?.tabs ?? this.state.tabs
      };

      this.state = nextState;
      storage.setItemSync(this.storageKey, nextState);
    } catch (error) {
      logger.warn('Failed to save window state, windowId = {windowId}, error = {error}', { windowId: this.options.windowId, error });
    }
  }

  private stateChangeHandler = (): void => {
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
    }
    this.stateChangeTimer = setTimeout(() => this.updateState(), this.eventHandlingDelay);
  };

  private closeHandler = (): void => {
    this.updateState();
  };

  private closedHandler = (): void => {
    this.unmanage();
    this.saveState();
    WindowStateManager.instances.delete(this);
  };

  manage(win: BaseWindow): void {
    this.validateState();

    const initialBounds = {
      x: this.state.x!,
      y: this.state.y!,
      width: this.state.width,
      height: this.state.height
    };

    win.setBounds(initialBounds, false);

    if (this.options.restoreMaximized !== false && this.state.isMaximized) {
      win.maximize();
    }
    if (this.options.restoreFullScreen !== false && this.state.isFullScreen) {
      win.setFullScreen(true);
    }

    win.on('always-on-top-changed', () => this.stateChangeHandler());
    win.on('resize', this.stateChangeHandler);
    win.on('move', this.stateChangeHandler);
    win.on('close', this.closeHandler);
    win.on('closed', this.closedHandler);
    this.winRef = win;
  }

  unmanage(): void {
    if (this.winRef) {
      this.winRef.removeListener('always-on-top-changed', this.stateChangeHandler);
      this.winRef.removeListener('resize', this.stateChangeHandler);
      this.winRef.removeListener('move', this.stateChangeHandler);
      if (this.stateChangeTimer) {
        clearTimeout(this.stateChangeTimer);
        this.stateChangeTimer = null;
      }
      this.winRef.removeListener('close', this.closeHandler);
      this.winRef.removeListener('closed', this.closedHandler);
      this.winRef = null;
    }
  }

  get x(): number | undefined {
    return this.state.x;
  }
  get y(): number | undefined {
    return this.state.y;
  }
  get width(): number {
    return this.state.width;
  }
  get height(): number {
    return this.state.height;
  }
  get displayBounds(): Electron.Rectangle | undefined {
    return this.state.displayBounds;
  }
  get isMaximized(): boolean {
    return this.state.isMaximized;
  }
  get isFullScreen(): boolean {
    return this.state.isFullScreen;
  }
  get isAlwaysOnTop(): boolean {
    return this.state.isAlwaysOnTop;
  }
  get windowState(): WindowState {
    return { ...this.state };
  }

  resetStateToDefault(): void {
    this.resetToDefault();
    this.saveState();
  }

  static saveAllStates(): void {
    WindowStateManager.instances.forEach((instance) => instance.saveState());
  }
}
