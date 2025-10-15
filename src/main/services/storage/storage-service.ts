import type { IpcMainInvokeEvent } from 'electron';
import { type StorageValue, type StorageMeta } from 'electron-async-storage';
import { Handler, Service } from '@/shared/decorators';
import type { StorageMetadata, StorageOptions, StorageItem } from '@/shared/types/storage';
import { eventEmitterService } from '@/main/services/events/broadcaster';
import { storage } from '@/main/core/storage/config';
import { getLoggerBy } from '@/shared/logging/helpers';

const logger = getLoggerBy('storage', 'service');

@Service
export class StorageService {
  private globalWatcher?: () => void;
  private subscribers = new Set<string>();
  private latestSenders = new Map<string, number>();

  constructor() {
    this.initGlobalWatcher();
  }

  private async initGlobalWatcher(): Promise<void> {
    this.globalWatcher = await storage.watch(async (_event, key) => {
      if (!this.subscribers.has(key)) return;

      const newValue = await storage.getItem(key);
      const senderId = this.latestSenders.get(key);

      if (senderId) {
        this.latestSenders.delete(key);
      }

      logger.debug('Storage changed for key {key}, send to other WebContentView except {senderId}', {
        key,
        senderId: senderId ?? 'none (main process update)'
      });

      eventEmitterService.emitExcept(`storage:${key}`, { key, value: newValue }, senderId);
    });
  }

  @Handler
  async setItem(event: IpcMainInvokeEvent, key: string, value: StorageValue): Promise<void> {
    this.latestSenders.set(key, event.sender.id);

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
      this.latestSenders.set(item.key, event.sender.id);
    });

    const formattedItems = items.map((item) => ({
      key: item.key,
      value: item.value,
      options: {}
    }));
    await storage.setItems(formattedItems);
  }

  @Handler
  async watch(_event: IpcMainInvokeEvent, watchKey: string): Promise<void> {
    this.subscribers.add(watchKey);
  }

  @Handler
  async unwatch(_event: IpcMainInvokeEvent, watchKey: string): Promise<void> {
    this.subscribers.delete(watchKey);
  }

  async dispose(): Promise<void> {
    if (this.globalWatcher) {
      this.globalWatcher();
    }
    this.subscribers.clear();
    await storage.dispose();
  }
}

export const storageService = new StorageService();
