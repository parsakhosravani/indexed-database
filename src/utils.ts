/**
 * Utility functions for IndexedDB operations
 */

/**
 * Create IDBKeyRange objects with a fluent API
 */
export const createKeyRange = {
  /**
   * Create a range that only includes the given key
   */
  only(value: any): IDBKeyRange {
    return IDBKeyRange.only(value);
  },

  /**
   * Create a range with a lower bound
   */
  lowerBound(lower: any, open = false): IDBKeyRange {
    return IDBKeyRange.lowerBound(lower, open);
  },

  /**
   * Create a range with an upper bound
   */
  upperBound(upper: any, open = false): IDBKeyRange {
    return IDBKeyRange.upperBound(upper, open);
  },

  /**
   * Create a range with both bounds
   */
  bound(lower: any, upper: any, lowerOpen = false, upperOpen = false): IDBKeyRange {
    return IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen);
  },

  /**
   * Create a range for values starting with a prefix (useful for strings)
   */
  startsWith(prefix: string): IDBKeyRange {
    // '\uffff' sorts after every other character, so this matches any string
    // beginning with `prefix` (and works for an empty prefix too)
    return IDBKeyRange.bound(prefix, prefix + '\uffff', false, false);
  },

  /**
   * Create a range between two values (inclusive)
   */
  between(start: any, end: any): IDBKeyRange {
    return IDBKeyRange.bound(start, end, false, false);
  },

  /**
   * Create a range for all values greater than the given value
   */
  greaterThan(value: any): IDBKeyRange {
    return IDBKeyRange.lowerBound(value, true);
  },

  /**
   * Create a range for all values less than the given value
   */
  lessThan(value: any): IDBKeyRange {
    return IDBKeyRange.upperBound(value, true);
  },
};

/**
 * Check if IndexedDB is supported in the current environment
 */
export function isIndexedDBSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

/**
 * Get all database names (requires IndexedDB 3.0+)
 */
export async function listDatabases(): Promise<IDBDatabaseInfo[]> {
  if (!indexedDB.databases) {
    throw new Error('indexedDB.databases() is not supported in this browser');
  }
  return indexedDB.databases();
}

/**
 * Export data from a store to JSON
 */
export async function exportStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Import data into a store from JSON
 */
export async function importStore<T>(db: IDBDatabase, storeName: string, data: T[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('Transaction aborted'));

    data.forEach((item) => {
      store.put(item);
    });
  });
}
