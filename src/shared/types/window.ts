import { BaseWindow } from 'electron';

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
  displayId?: number;
}

export type WindowType = 'shell' | 'ghost';

export interface TaggedBaseWindow extends BaseWindow {
  __windowType?: WindowType;
}

export function tagBaseWindow(window: BaseWindow, type: WindowType): TaggedBaseWindow {
  const tagged = window as TaggedBaseWindow;
  tagged.__windowType = type;

  return tagged;
}

export function isGhostWindow(window: BaseWindow) {
  return (window as TaggedBaseWindow).__windowType === 'ghost';
}

export function getAllShellWindows() {
  const windows = BaseWindow.getAllWindows() as TaggedBaseWindow[];
  return windows.filter((win) => win.__windowType === 'shell');
}
