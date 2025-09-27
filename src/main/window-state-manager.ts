import type { InternalWindowState, WindowState } from '@/shared/types/window';
import type { BrowserWindow } from 'electron';
import { screen } from 'electron';
import { storage } from '@/main/storage';
import { STORAGES } from '@/shared/types/storage-key';

export interface WindowStateManagerOptions {
  windowId: string;
  defaultState?: Partial<WindowState>;
  restoreMaximized?: boolean;
  restoreFullScreen?: boolean;
}

export class WindowStateManager {
  private static instances = new Set<WindowStateManager>();

  private state: InternalWindowState;
  private winRef: BrowserWindow | null = null;
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
      console.warn(`Failed to load window state for ${this.options.windowId}:`, error);
    }
  }

  private isNormal(win: BrowserWindow): boolean {
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
    const displayBounds = screen.getPrimaryDisplay().bounds;
    const defaults = this.options.defaultState || {};
    this.state = {
      ...this.state,
      width: defaults.width || 800,
      height: defaults.height || 600,
      x: 0,
      y: 0,
      displayBounds
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

  private ensureWindowVisibleOnSomeDisplay(): void {
    const visible = screen.getAllDisplays().some((display) => {
      return this.windowWithinBounds(display.bounds);
    });

    if (!visible) {
      this.resetToDefault();
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

  private updateState(win?: BrowserWindow): void {
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
      this.state.isMaximized = window.isMaximized();
      this.state.isFullScreen = window.isFullScreen();
      this.state.displayBounds = screen.getDisplayMatching(winBounds).bounds;
    } catch (error) {
      console.warn('Failed to update window state:', error);
    }
  }

  private saveState(win?: BrowserWindow): void {
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
      console.warn(`Failed to save window state for ${this.options.windowId}:`, error);
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

  manage(win: BrowserWindow): void {
    if (this.options.restoreMaximized !== false && this.state.isMaximized) {
      win.maximize();
    }
    if (this.options.restoreFullScreen !== false && this.state.isFullScreen) {
      win.setFullScreen(true);
    }

    win.on('resize', this.stateChangeHandler);
    win.on('move', this.stateChangeHandler);
    win.on('close', this.closeHandler);
    win.on('closed', this.closedHandler);
    this.winRef = win;
  }

  unmanage(): void {
    if (this.winRef) {
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
