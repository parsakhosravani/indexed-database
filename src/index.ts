/**
 * IndexedDB Wrapper Library
 *
 * A modern TypeScript wrapper for IndexedDB providing:
 * - Promise-based API
 * - Type-safe operations
 * - Advanced querying with cursors
 * - Transaction management and bulk writes
 * - Safe schema upgrades (new stores and indexes)
 */

export { IndexedDatabase } from './database';
export * from './types';

// Utility functions
export {
  createKeyRange,
  isIndexedDBSupported,
  listDatabases,
  exportStore,
  importStore,
} from './utils';
