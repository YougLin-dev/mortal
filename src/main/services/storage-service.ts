import type { IpcMainInvokeEvent } from 'electron';
import { type StorageValue, type StorageMeta } from 'electron-async-storage';
import { Handler, Service } from '@/shared/decorators';
import type { StorageMetadata, StorageOptions, StorageItem } from '@/shared/types/storage';
import { eventEmitterService } from './event-emitter';
import { storage } from '@/main/storage';

@Service
export class StorageService {
  private watches = new Map<string, () => void>();

  @Handler
  async setItem(_event: IpcMainInvokeEvent, key: string, value: StorageValue): Promise<void> {
    await storage.setItem(key, value);
  }

  @Handler
  async getItem<T = StorageValue>(_event: IpcMainInvokeEvent, key: string): Promise<T | null> {
    return await storage.getItem<T>(key);
  }

  @Handler
  async hasItem(_event: IpcMainInvokeEvent, key: string): Promise<boolean> {
    return await storage.hasItem(key);
  }

  @Handler
  async removeItem(_event: IpcMainInvokeEvent, key: string, options: StorageOptions = {}): Promise<void> {
    await storage.removeItem(key, options);
  }

  @Handler
  async getKeys(_event: IpcMainInvokeEvent, base?: string): Promise<string[]> {
    return await storage.getKeys(base);
  }

  @Handler
  async clear(_event: IpcMainInvokeEvent, base?: string): Promise<void> {
    await storage.clear(base);
  }

  @Handler
  async getMeta(_event: IpcMainInvokeEvent, key: string): Promise<StorageMetadata> {
    return await storage.getMeta(key);
  }

  @Handler
  async setMeta(_event: IpcMainInvokeEvent, key: string, metadata: StorageMeta): Promise<void> {
    await storage.setMeta(key, metadata);
  }

  @Handler
  async removeMeta(_event: IpcMainInvokeEvent, key: string): Promise<void> {
    await storage.removeMeta(key);
  }

  @Handler
  async getItems(_event: IpcMainInvokeEvent, keys: string[]): Promise<StorageItem[]> {
    const items = await storage.getItems(keys);
    return items.map((item) => ({
      key: item.key,
      value: item.value
    }));
  }

  @Handler
  async setItems(_event: IpcMainInvokeEvent, items: StorageItem[]): Promise<void> {
    const formattedItems = items.map((item) => ({
      key: item.key,
      value: item.value,
      options: {}
    }));
    await storage.setItems(formattedItems);
  }

  @Handler
  async watch<T extends StorageValue>(_event: IpcMainInvokeEvent, watchKey: string): Promise<void> {
    if (this.watches.has(watchKey)) return;
    const unwatch = await storage.watch(async (_event, key) => {
      if (key === watchKey) {
        const newValue = await storage.getItem<T>(watchKey);
        eventEmitterService.emit(`storage:${watchKey}`, { key, value: newValue });
      }
    });
    this.watches.set(watchKey, unwatch);
  }

  @Handler
  async unwatch(_event: IpcMainInvokeEvent, watchKey: string): Promise<void> {
    const unwatch = this.watches.get(watchKey);
    if (unwatch) {
      unwatch();
      this.watches.delete(watchKey);
    }
  }

  async dispose(): Promise<void> {
    await storage.dispose();
  }
}

export const storageService = new StorageService();
