import { BaseWindow } from 'electron';

/**
 * WeakSet to track ghost windows (utility windows for drag feedback)
 * Using WeakSet ensures no memory leaks and type-safe implementation
 */
const ghostWindows = new WeakSet<BaseWindow>();

/**
 * Mark a window as a ghost window
 */
export const markGhostWindow = (w: BaseWindow): void => {
  ghostWindows.add(w);
};

/**
 * Check if a window is a ghost window
 */
export const isGhostWindow = (w: BaseWindow): boolean => {
  return ghostWindows.has(w);
};

/**
 * Get all real application windows (excluding ghost windows)
 */
export const getRealAppWindows = (): BaseWindow[] => {
  return BaseWindow.getAllWindows().filter((w) => !isGhostWindow(w));
};
