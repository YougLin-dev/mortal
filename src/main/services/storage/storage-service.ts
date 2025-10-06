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
  private watches = new Map<string, () => void>();
  private senderQueues = new Map<string, number[]>();

  @Handler
  async setItem(event: IpcMainInvokeEvent, key: string, value: StorageValue): Promise<void> {
    const queue = this.senderQueues.get(key) || [];
    queue.push(event.sender.id);
    this.senderQueues.set(key, queue);

    logger.debug('Enqueued sender {senderId} for key {key} (queue length: {length})', {
      senderId: event.sender.id,
      key,
      length: queue.length
    });

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
      const queue = this.senderQueues.get(item.key) || [];
      queue.push(event.sender.id);
      this.senderQueues.set(item.key, queue);
    });

    logger.debug('Enqueued sender {senderId} for {count} keys', {
      senderId: event.sender.id,
      count: items.length
    });

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

        const queue = this.senderQueues.get(watchKey);

        // Take the LAST sender (most recent update that survived queue merging)
        const senderId = queue?.pop();

        // Clear the entire queue to prevent accumulation
        if (queue) {
          this.senderQueues.delete(watchKey);
        }

        logger.debug('Storage changed for key {key}, using last sender {senderId} (queue cleared)', {
          key: watchKey,
          senderId: senderId ?? 'none (main process update)'
        });

        // Broadcast to all windows except the final sender
        eventEmitterService.emitExcept(`storage:${watchKey}`, { key, value: newValue }, senderId);
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
