import type { ThemeState } from '@/shared/types/theme';
import type { StorageValue } from 'electron-async-storage';

export const UNIFIED_EVENT_CHANNEL = 'unified-channel';

export const GLOBAL_EVENTS = {
  THEME_CHANGED: 'theme-changed',
  THEME_ERROR: 'theme-error',
  STORAGE_PREFIX: 'storage:*'
} as const;

export interface GlobalEventDataMap {
  // theme
  [GLOBAL_EVENTS.THEME_CHANGED]: ThemeState;
  [GLOBAL_EVENTS.THEME_ERROR]: { error: string };

  // storage
  [key: `storage:${string}`]: { key: string; value: StorageValue };
}
