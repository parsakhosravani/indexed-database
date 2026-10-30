/**
 * Core types for IndexedDB wrapper
 */

export interface IDBConfig {
  dbName: string;
  version?: number;
  stores: StoreConfig[];
}

export interface StoreConfig {
  name: string;
  keyPath?: string | string[];
  autoIncrement?: boolean;
  indexes?: IndexConfig[];
}

export interface IndexConfig {
  name: string;
  keyPath: string | string[];
  unique?: boolean;
  multiEntry?: boolean;
}

export interface QueryOptions {
  index?: string;
  /** Only visit keys (or index values, when `index` is set) in this range */
  range?: IDBValidKey | IDBKeyRange;
  direction?: IDBCursorDirection;
  limit?: number;
  offset?: number;
}

export type TransactionMode = 'readonly' | 'readwrite';

export interface Transaction<T = any> {
  add(storeName: string, value: T, key?: IDBValidKey): Promise<IDBValidKey>;
  put(storeName: string, value: T, key?: IDBValidKey): Promise<IDBValidKey>;
  get(storeName: string, key: IDBValidKey): Promise<T | undefined>;
  getAll(storeName: string, query?: IDBValidKey | IDBKeyRange, count?: number): Promise<T[]>;
  delete(storeName: string, key: IDBValidKey): Promise<void>;
  clear(storeName: string): Promise<void>;
  count(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<number>;
}
