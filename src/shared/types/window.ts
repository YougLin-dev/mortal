export interface WindowState {
  // window state manager
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isMinimized: boolean;
  isFullScreen: boolean;

  //
  windowId: string;
  type: 'main' | 'detached';
  isAlwaysOnTop: boolean;
  tabs: Tab[];
}

export interface Tab {
  id: string;
  name: string;
  isActive: boolean;
  pinned: boolean;
  url: string;
}

export interface InternalWindowState extends WindowState {
  displayBounds?: Electron.Rectangle;
}
