import type { ElectronAPI } from '@electron-toolkit/preload';
import type { Emitter } from 'mitt';
import type { GlobalEventDataMap } from '@/shared/types/event';
import type { ThemeType } from '@/shared/types/theme';
import type { StorageMetadata, StorageOptions, StorageItem } from '@/shared/types/storage';
import type { StorageValue } from 'electron-async-storage';
import type { WindowState } from '@/shared/types/window';
import type { IpcResponse, StreamController } from '@/shared/types/router';

declare global {
  interface Window {
    platform: string;

    themeService: {
      setTheme: (theme: ThemeType) => Promise<void>;
    };

    shellWindowService: {
      setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>;
      showTabContextMenu: (params: { tabId: string; template: { action: string; label: string }[] }) => Promise<void>;
    };

    tabService: {
      switchTab: (tabId: string, tabUrl: string) => Promise<void>;
      closeTab: (tabId: string) => Promise<void>;
      detachToNewWindow: (tabId: string, pointer?: { screenX: number; screenY: number }) => Promise<{ newWindowId: string } | null>;
      dropAtPointer: (
        tabId: string,
        pointer: { screenX: number; screenY: number }
      ) => Promise<{ action: 'merged'; targetWindowId: string } | { action: 'detached'; newWindowId: string } | null>;
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

    _ipcFetchRaw: (url: string, init?: RequestInit) => Promise<IpcResponse>;
    _createStreamController: (streamId: string) => StreamController;
    _abortIpcRequest: (requestId: string) => void;
    ipcFetch: (url: string, init?: RequestInit) => Promise<Response>;
    electron: ElectronAPI;
    events: Emitter<GlobalEventDataMap>;
    windowState: WindowState | null;
    locale: string;
  }
}

export {};
