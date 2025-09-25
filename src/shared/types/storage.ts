import type { StorageValue } from 'electron-async-storage';

export interface StorageMetadata {
  mtime?: Date;
  atime?: Date;
  size?: number;
}

export interface StorageOptions {
  removeMeta?: boolean;
}

export interface StorageItem<T = StorageValue> {
  key: string;
  value: T;
}
