import type { IpcMainInvokeEvent } from 'electron';
import { type StorageValue, type StorageMeta } from 'electron-async-storage';
import { Handler, Service } from '@/shared/decorators';
import type { StorageMetadata, StorageOptions, StorageItem } from '@/shared/types/storage';
import { eventEmitterService } from '@/main/services/events/broadcaster';
import { storage } from '@/main/core/storage/config';

@Service
export class StorageService {
  @Handler
  async setItem(event: IpcMainInvokeEvent, key: string, value: StorageValue): Promise<void> {
    eventEmitterService.emitExcept(`storage:${key}`, { key, value }, event.sender.id);
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
  async setItems(event: IpcMainInvokeEvent, items: StorageItem[]): Promise<void> {
    items.forEach((item) => {
      eventEmitterService.emitExcept(`storage:${item.key}`, { key: item.key, value: item.value }, event.sender.id);
    });

    const formattedItems = items.map((item) => ({
      key: item.key,
      value: item.value,
      options: {}
    }));
    await storage.setItems(formattedItems);
  }

  async dispose(): Promise<void> {
    await storage.dispose();
  }
}

export const storageService = new StorageService();
