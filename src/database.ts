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

      request.onblocked = () => {
        reject(
          new Error(
            `Opening "${this.dbName}" v${this.version} is blocked: close other tabs using an older version`
          )
        );
      };

      request.onsuccess = () => {
        this.db = request.result;
        // Let a newer version in another tab upgrade instead of blocking it forever
        this.db.onversionchange = () => this.close();
        resolve();
      };

      request.onupgradeneeded = () => {
        const upgradeTx = request.transaction;
        if (!upgradeTx) return;
        this.handleUpgrade(request.result, upgradeTx);
      };
    });
  }

  /**
   * Handle database upgrade: create new stores and add any new indexes to
   * existing stores (through the version-change transaction).
   */
  private handleUpgrade(db: IDBDatabase, upgradeTx: IDBTransaction): void {
    this.stores.forEach((storeConfig) => {
      const objectStore = db.objectStoreNames.contains(storeConfig.name)
        ? upgradeTx.objectStore(storeConfig.name)
        : db.createObjectStore(storeConfig.name, {
            keyPath: storeConfig.keyPath,
            autoIncrement: storeConfig.autoIncrement,
          });

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
   * Insert or update many records in one transaction. Either all are written
   * or none are (the transaction is rolled back on the first error).
   */
  async bulkPut<T>(storeName: string, values: T[]): Promise<IDBValidKey[]> {
    if (!this.db) {
      throw new Error('Database not opened');
    }
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const keys: IDBValidKey[] = new Array(values.length);

    return new Promise((resolve, reject) => {
      values.forEach((value, i) => {
        const req = store.put(value);
        req.onsuccess = () => {
          keys[i] = req.result;
        };
      });
      tx.oncomplete = () => resolve(keys);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
    });
  }

  /**
   * Delete many records by key in one transaction
   */
  async bulkDelete(storeName: string, keys: IDBValidKey[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not opened');
    }
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      keys.forEach((key) => store.delete(key));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
    });
  }

  /**
   * Get the first record matching an index value (e.g. find a user by email)
   */
  async getByIndex<T>(
    storeName: string,
    indexName: string,
    query: IDBValidKey | IDBKeyRange
  ): Promise<T | undefined> {
    const store = this.getStore(storeName, 'readonly');
    return this.promisifyRequest(store.index(indexName).get(query));
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
