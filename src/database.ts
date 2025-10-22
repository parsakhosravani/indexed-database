import { IDBConfig, StoreConfig, TransactionMode, QueryOptions } from './types';

/**
 * Main IndexedDB wrapper class
 */
export class IndexedDatabase {
  private dbName: string;
  private version: number;
  private stores: StoreConfig[];
  private db: IDBDatabase | null = null;

  constructor(config: IDBConfig) {
    this.dbName = config.dbName;
    this.version = config.version || 1;
    this.stores = config.stores;
  }

  /**
   * Open database connection and create/upgrade stores
   */
  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.handleUpgrade(db, event.oldVersion);
      };
    });
  }

  /**
   * Handle database upgrade - create stores and indexes
   */
  private handleUpgrade(db: IDBDatabase, oldVersion: number): void {
    this.stores.forEach((storeConfig) => {
      let objectStore: IDBObjectStore;

      // Create store if it doesn't exist
      if (!db.objectStoreNames.contains(storeConfig.name)) {
        objectStore = db.createObjectStore(storeConfig.name, {
          keyPath: storeConfig.keyPath,
          autoIncrement: storeConfig.autoIncrement,
        });
      } else {
        // Note: Can't modify existing store during upgrade without transaction
        return;
      }

      // Create indexes
      if (storeConfig.indexes) {
        storeConfig.indexes.forEach((indexConfig) => {
          if (!objectStore.indexNames.contains(indexConfig.name)) {
            objectStore.createIndex(indexConfig.name, indexConfig.keyPath, {
              unique: indexConfig.unique || false,
              multiEntry: indexConfig.multiEntry || false,
            });
          }
        });
      }
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Delete the entire database
   */
  static async deleteDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Database deletion blocked'));
    });
  }

  /**
   * Get object store for transaction
   */
  private getStore(storeName: string, mode: TransactionMode): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not opened');
    }
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  /**
   * Add a new record
   */
  async add<T>(storeName: string, value: T, key?: IDBValidKey): Promise<IDBValidKey> {
    const store = this.getStore(storeName, 'readwrite');
    return this.promisifyRequest(store.add(value, key));
  }

  /**
   * Update or insert a record
   */
  async put<T>(storeName: string, value: T, key?: IDBValidKey): Promise<IDBValidKey> {
    const store = this.getStore(storeName, 'readwrite');
    return this.promisifyRequest(store.put(value, key));
  }

  /**
   * Get a record by key
   */
  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    const store = this.getStore(storeName, 'readonly');
    return this.promisifyRequest(store.get(key));
  }

  /**
   * Get all records (optionally filtered)
   */
  async getAll<T>(
    storeName: string,
    query?: IDBValidKey | IDBKeyRange,
    count?: number
  ): Promise<T[]> {
    const store = this.getStore(storeName, 'readonly');
    return this.promisifyRequest(store.getAll(query, count));
  }

  /**
   * Get records using an index
   */
  async getAllByIndex<T>(
    storeName: string,
    indexName: string,
    query?: IDBValidKey | IDBKeyRange,
    count?: number
  ): Promise<T[]> {
    const store = this.getStore(storeName, 'readonly');
    const index = store.index(indexName);
    return this.promisifyRequest(index.getAll(query, count));
  }

  /**
   * Query with cursor for advanced filtering
   */
  async query<T>(
    storeName: string,
    options: QueryOptions = {},
    filter?: (value: T) => boolean
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly');
      const source = options.index ? store.index(options.index) : store;
      const results: T[] = [];
      let skipped = 0;
      const offset = options.offset || 0;
      const limit = options.limit;

      const request = source.openCursor(null, options.direction);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;

        if (!cursor) {
          resolve(results);
          return;
        }

        const value = cursor.value as T;

        // Apply filter if provided
        if (!filter || filter(value)) {
          // Handle offset
          if (skipped < offset) {
            skipped++;
            cursor.continue();
            return;
          }

          results.push(value);

          // Handle limit
          if (limit && results.length >= limit) {
            resolve(results);
            return;
          }
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a record by key
   */
  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const store = this.getStore(storeName, 'readwrite');
    return this.promisifyRequest(store.delete(key));
  }

  /**
   * Clear all records from a store
   */
  async clear(storeName: string): Promise<void> {
    const store = this.getStore(storeName, 'readwrite');
    return this.promisifyRequest(store.clear());
  }

  /**
   * Count records in a store
   */
  async count(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<number> {
    const store = this.getStore(storeName, 'readonly');
    return this.promisifyRequest(store.count(query));
  }

  /**
   * Execute multiple operations in a single transaction
   */
  async transaction<T>(
    storeNames: string | string[],
    mode: TransactionMode,
    callback: (tx: IDBTransaction, stores: IDBObjectStore[]) => Promise<T>
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database not opened');
    }

    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const tx = this.db.transaction(names, mode);
    const stores = names.map((name) => tx.objectStore(name));

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Transaction aborted'));

      let result: T;
      callback(tx, stores)
        .then((res) => {
          result = res;
        })
        .catch((err) => {
          tx.abort();
          reject(err);
        });
    });
  }

  /**
   * Helper to promisify IDBRequest
   */
  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all keys from a store
   */
  async getAllKeys(
    storeName: string,
    query?: IDBValidKey | IDBKeyRange,
    count?: number
  ): Promise<IDBValidKey[]> {
    const store = this.getStore(storeName, 'readonly');
    return this.promisifyRequest(store.getAllKeys(query, count));
  }

  /**
   * Check if database is open
   */
  isOpen(): boolean {
    return this.db !== null;
  }

  /**
   * Get database name
   */
  getName(): string {
    return this.dbName;
  }

  /**
   * Get database version
   */
  getVersion(): number {
    return this.version;
  }
}
