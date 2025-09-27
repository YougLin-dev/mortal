import type { ElectronAPI } from '@electron-toolkit/preload';
import type { Emitter } from 'mitt';
import type { GlobalEventDataMap } from '@/shared/types/event';
import type { ThemeType } from '@/shared/types/theme';
import type { StorageMetadata, StorageOptions, StorageItem } from '@/shared/types/storage';
import type { StorageValue } from 'electron-async-storage';
import type { WindowState } from '@/shared/types/window';

declare global {
  interface Window {
    systemService: {
      save: (data: string) => void;
      log: (message: string, level?: 'info' | 'warn' | 'error') => void;
      notify: (title: string, message: string) => void;
      add: (x: number, y: number) => Promise<number>;
      getSystemInfo: () => Promise<{
        platform: string;
        timestamp: number;
        uptime: number;
        requesterId: number;
      }>;
      fetchUserData: (userId: string) => Promise<{ id: string; name: string; lastLogin: number; requesterId: number }>;
      multiply: (x: number, y: number) => Promise<number>;
    };

    themeService: {
      setTheme: (theme: ThemeType) => Promise<void>;
    };

    windowService: {
      setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>;
    };

    storageService: {
      setItem: (key: string, value: StorageValue) => Promise<void>;
      getItem: <T = StorageValue>(key: string) => Promise<T | null>;
      hasItem: (key: string) => Promise<boolean>;
      removeItem: (key: string, options?: StorageOptions) => Promise<void>;
      getKeys: (base?: string) => Promise<string[]>;
      clear: (base?: string) => Promise<void>;
      getMeta: (key: string) => Promise<StorageMetadata>;
      setMeta: (key: string, metadata: Record<string, StorageValue | Date | undefined>) => Promise<void>;
      removeMeta: (key: string) => Promise<void>;
      watch: (watchKey: string) => Promise<void>;
      unwatch: (watchKey: string) => Promise<void>;
      getItems: (keys: string[]) => Promise<StorageItem[]>;
      setItems: (items: StorageItem[]) => Promise<void>;
    };

    electron: ElectronAPI;
    events: Emitter<GlobalEventDataMap>;
    windowState: WindowState;
    isMac: boolean;
  }
}

export {};
