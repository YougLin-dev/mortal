import type { ThemeState } from '@/shared/types/theme';
import type { WindowState } from '@/shared/types/window';
import type { StorageValue } from 'electron-async-storage';

export const UNIFIED_EVENT_CHANNEL = 'unified-channel';

export const GLOBAL_EVENTS = {
  THEME_CHANGED: 'theme-changed',
  THEME_ERROR: 'theme-error',
  STORAGE_PREFIX: 'storage:*',
  TAB_CONTEXT_MENU_ACTION: 'tab-context-menu-action',
  TAB_DETACHED: 'tab-detached',
  TAB_ATTACHED: 'tab-attached',
  TAB_DRAG_GHOST_HOVER: 'tab-drag-ghost-hover',
  TAB_DRAG_GHOST_CLEAR: 'tab-drag-ghost-clear',
  WINDOW_STATE_UPDATE: 'window-state-update'
} as const;

export interface GlobalEventDataMap {
  // theme
  [GLOBAL_EVENTS.THEME_CHANGED]: ThemeState;
  [GLOBAL_EVENTS.THEME_ERROR]: { error: string };

  // storage
  [key: `storage:${string}`]: { key: string; value: StorageValue };

  // tab context menu
  [GLOBAL_EVENTS.TAB_CONTEXT_MENU_ACTION]: { action: string; tabId?: string };

  // tab detached
  [GLOBAL_EVENTS.TAB_DETACHED]: { tabId: string; newWindowId: string };

  // tab attached
  [GLOBAL_EVENTS.TAB_ATTACHED]: { tabId: string; tab: import('./window').Tab; originWindowId: string; toIndex?: number };

  // tab drag ghost
  [GLOBAL_EVENTS.TAB_DRAG_GHOST_HOVER]: { clientX: number; clientY: number; draggedWidth: number };
  [GLOBAL_EVENTS.TAB_DRAG_GHOST_CLEAR]: Record<string, never>;

  // window state
  [GLOBAL_EVENTS.WINDOW_STATE_UPDATE]: { windowState: WindowState };

  [key: string]: unknown;
  [key: symbol]: unknown;
}
