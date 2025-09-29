/**
 * Core types for store system
 */

import type { StorageValue } from 'electron-async-storage';

/**
 * Base interface for all stores
 */
export interface IStore<T> {
  readonly state: T;
}

/**
 * Interface for persisted stores
 */
export interface IPersistedStore<T extends StorageValue> extends IStore<T> {
  readonly key: string;
}
