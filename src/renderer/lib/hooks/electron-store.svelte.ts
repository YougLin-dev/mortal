import { isEqual } from 'es-toolkit';
import { createSubscriber } from 'svelte/reactivity';
import type { StorageValue } from 'electron-async-storage';
import superjson from 'superjson';

class ElectronStorageAdapter<T extends StorageValue> {
  private storageService = window.storageService;
  private events = window.events;

  async getItemAsync(key: string): Promise<T | null> {
    return await this.storageService.getItem<T>(key);
  }

  async setItemAsync(key: string, value: T | null): Promise<void> {
    const serializedValue = value ? (superjson.parse(superjson.stringify(value)) as T) : value;
    await this.storageService.setItem(key, serializedValue);
  }

  async removeItemAsync(key: string): Promise<void> {
    await this.storageService.removeItem(key);
  }

  async clearAsync(): Promise<void> {
    await this.storageService.clear();
  }

  async watchAsync<T extends StorageValue>(watchKey: string, callback: (params: { key: string; value: T }) => void): Promise<void> {
    await this.storageService.watch(watchKey);

    this.events.on(`storage:${watchKey}`, (event) => {
      callback({ key: event.key, value: event.value as T });
    });
  }

  async unwatchAsync(watchKey: string): Promise<void> {
    await this.storageService.unwatch(watchKey);
  }
}

function proxy<T>(
  value: unknown,
  root: T | undefined,
  proxies: WeakMap<WeakKey, unknown>,
  subscribe: VoidFunction | undefined,
  update: VoidFunction | undefined,
  store: (root?: T | undefined) => void
): T {
  if (value === null || typeof value !== 'object') {
    return value as T;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== null && proto !== Object.prototype && !Array.isArray(value)) {
    return value as T;
  }
  let p = proxies.get(value);
  if (!p) {
    p = new Proxy(value, {
      get: (target, property) => {
        subscribe?.();
        return proxy(Reflect.get(target, property), root, proxies, subscribe, update, store);
      },
      set: (target, property, value) => {
        update?.();
        Reflect.set(target, property, value);
        store(root);
        return true;
      }
    });
    proxies.set(value, p);
  }
  return p as T;
}

export class ElectronStore<T extends StorageValue> {
  #current: T | undefined;
  #key: string;
  #storage?: ElectronStorageAdapter<T>;
  #subscribe?: VoidFunction;
  #update: VoidFunction | undefined;
  #proxies = new WeakMap();
  #isStoring = false;
  #pendingValue: T | null | undefined = undefined;

  constructor(key: string, initialValue: T) {
    this.#current = initialValue;
    this.#key = key;
    this.#storage = new ElectronStorageAdapter<T>();

    this.#hydratePersistState(key, initialValue);

    this.#subscribe = createSubscriber((update) => {
      this.#update = update;
      this.#storage?.watchAsync<T>(this.#key, (event) => {
        console.log(`Data ${event.key} persist success`);
      });
      return () => {
        this.#update = undefined;
        this.#storage?.unwatchAsync(this.#key);
      };
    });
  }

  get current(): T {
    this.#subscribe?.();
    const root = this.#current;
    return proxy(root, root, this.#proxies, this.#subscribe?.bind(this), this.#update?.bind(this), this.#store.bind(this));
  }

  set current(newValue: T) {
    this.#current = newValue;
    this.#store(newValue);
    this.#update?.();
  }

  async #hydratePersistState(key: string, initialValue: T): Promise<void> {
    try {
      const electronStorage = this.#storage;
      const existingValue = await electronStorage?.getItemAsync(key);
      if (existingValue == null) {
        await electronStorage?.setItemAsync(key, initialValue);
        return;
      }

      if (!isEqual(existingValue, initialValue)) {
        this.#current = existingValue;
        this.#update?.();
      }
    } catch (error) {
      console.error(`Error hydrate persisted state from Electron storage for key "${key}":`, error);
      this.#current = initialValue;
    }
  }

  #store(value: T | undefined | null): void {
    if (this.#isStoring) {
      this.#pendingValue = value ?? null;
      return;
    }

    this.#isStoring = true;
    this.#storage
      ?.setItemAsync(this.#key, value ?? null)
      .then(() => {
        if (this.#pendingValue !== undefined) {
          const pending = this.#pendingValue;
          this.#pendingValue = undefined;
          this.#isStoring = false;
          this.#store(pending);
        } else {
          this.#isStoring = false;
        }
      })
      .catch((error) => {
        this.#isStoring = false;
        console.error(`Error when writing value from persisted store "${this.#key}" to Electron storage`, error);

        if (this.#pendingValue !== undefined) {
          const pending = this.#pendingValue;
          this.#pendingValue = undefined;
          setTimeout(() => this.#store(pending), 100);
        }
      });
  }
}
