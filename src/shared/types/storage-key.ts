import type { ThemeState } from './theme';
import type { WindowState } from './window';

export const STORAGES = {
  APP_THEME_STATE: 'app:theme:state',
  APP_WINDOWS: (windowId: string) => `app:windows:${windowId}` as const
} as const;

export type APPStorage = {
  items: {
    [STORAGES.APP_THEME_STATE]: ThemeState;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  } & {
    [K in `app:windows:${string}`]: WindowState;
  };
};

export type StorageKey = keyof typeof STORAGES;
