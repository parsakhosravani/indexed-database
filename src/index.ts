/**
 * IndexedDB Wrapper Library
 *
 * A modern TypeScript wrapper for IndexedDB providing:
 * - Promise-based API
 * - Type-safe operations
 * - Advanced querying with cursors
 * - Transaction management
 */

export { IndexedDatabase } from './database';
export * from './types';

// Utility functions
export { createKeyRange } from './utils';
