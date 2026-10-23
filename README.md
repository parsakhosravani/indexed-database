# IndexedDB Wrapper

A modern, TypeScript-first wrapper for IndexedDB providing a clean, promise-based API for browser-based database operations.

## Features

- 🎯 **Type-safe**: Full TypeScript support with generics
- 🔄 **Promise-based**: Modern async/await API
- 🚀 **Simple**: Intuitive API that abstracts IndexedDB complexity
- 🔍 **Advanced querying**: Support for indexes, cursors, and key ranges
- 💾 **Transaction support**: Execute multiple operations atomically
- 📥 **Bulk writes**: `bulkPut` / `bulkDelete` run in one transaction, so all records are written or none are
- 🧬 **Safe schema upgrades**: bump the version to add stores *and* new indexes to existing stores; other tabs on the old version close cleanly instead of blocking you
- 📦 **Zero dependencies**: Lightweight and self-contained

## Installation

Install straight from GitHub (it builds on install):

```bash
npm install github:parsakhosravani/indexed-database
```

## Quick Start

```typescript
import { IndexedDatabase } from 'indexed-database';

// Define your database schema
const db = new IndexedDatabase({
  dbName: 'myApp',
  version: 1,
  stores: [
    {
      name: 'users',
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'email', keyPath: 'email', unique: true },
        { name: 'age', keyPath: 'age' },
      ],
    },
  ],
});

// Open the database
await db.open();

// Add data
await db.add('users', { name: 'Alice', email: 'alice@example.com', age: 30 });

// Query data
const user = await db.get('users', 1);
const allUsers = await db.getAll('users');
const usersByEmail = await db.getAllByIndex('users', 'email', 'alice@example.com');

// Update data
await db.put('users', { id: 1, name: 'Alice Updated', email: 'alice@example.com', age: 31 });

// Delete data
await db.delete('users', 1);

// Close when done
db.close();
```

## API Reference

### Database Operations

#### `open(): Promise<void>`

Open the database connection.

#### `close(): void`

Close the database connection.

#### `static deleteDatabase(dbName: string): Promise<void>`

Delete an entire database.

### CRUD Operations

#### `add<T>(storeName: string, value: T, key?: IDBValidKey): Promise<IDBValidKey>`

Add a new record. Fails if key already exists.

#### `put<T>(storeName: string, value: T, key?: IDBValidKey): Promise<IDBValidKey>`

Update or insert a record.

#### `get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined>`

Get a record by key.

#### `getAll<T>(storeName: string, query?: IDBValidKey | IDBKeyRange, count?: number): Promise<T[]>`

Get all records, optionally filtered.

#### `delete(storeName: string, key: IDBValidKey): Promise<void>`

Delete a record by key.

#### `clear(storeName: string): Promise<void>`

Clear all records from a store.

#### `count(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<number>`

Count records in a store.

#### `bulkPut<T>(storeName: string, values: T[]): Promise<IDBValidKey[]>`

Insert or update many records in one transaction and get their keys back. If any write fails (for example, a unique index clash), nothing is saved.

```typescript
const ids = await db.bulkPut('users', [
  { name: 'Ana', email: 'ana@test.com', age: 31 },
  { name: 'Ben', email: 'ben@test.com', age: 27 },
]);
```

#### `bulkDelete(storeName: string, keys: IDBValidKey[]): Promise<void>`

Delete many records by key in one transaction.

### Advanced Querying

#### `getByIndex<T>(storeName: string, indexName: string, query: IDBValidKey | IDBKeyRange): Promise<T | undefined>`

Get the first record matching an index value, such as a user by email.

```typescript
const alice = await db.getByIndex('users', 'email', 'alice@test.com');
```

#### `getAllByIndex<T>(storeName: string, indexName: string, query?: IDBValidKey | IDBKeyRange, count?: number): Promise<T[]>`

Query records using an index.

#### `query<T>(storeName: string, options?: QueryOptions, filter?: (value: T) => boolean): Promise<T[]>`

Advanced querying with cursors, pagination, and custom filters.

```typescript
// Query with pagination
const page1 = await db.query('users', { limit: 10, offset: 0 });
const page2 = await db.query('users', { limit: 10, offset: 10 });

// Query with custom filter
const adults = await db.query('users', {}, (user) => user.age >= 18);

// Query using an index
const sorted = await db.query('users', { index: 'age', direction: 'next' });
```

### Transactions

#### `transaction<T>(storeNames: string | string[], mode: TransactionMode, callback: (tx: IDBTransaction, stores: IDBObjectStore[]) => Promise<T>): Promise<T>`

Execute multiple operations in a single transaction.

Use the stores passed to the callback, so every write belongs to the same transaction. If the callback throws, the whole transaction is rolled back.

```typescript
await db.transaction(['users', 'posts'], 'readwrite', async (tx, [users, posts]) => {
  users.add({ name: 'Bob', email: 'bob@test.com', age: 30 });
  posts.add({ userId: 1, content: 'Hello' });
});
```

## Utilities

### Key Ranges

```typescript
import { createKeyRange } from 'indexed-database';

// Get users with age between 20 and 30
const users = await db.getAll('users', createKeyRange.between(20, 30));

// Get users with age greater than 25
const adults = await db.getAllByIndex('users', 'age', createKeyRange.greaterThan(25));

// Get emails starting with 'alice'
const alices = await db.getAllByIndex('users', 'email', createKeyRange.startsWith('alice'));
```

### Import/Export

```typescript
// Export a store
const data = await db.getAll('users');
localStorage.setItem('backup', JSON.stringify(data));

// Import it again in one transaction
const backup = JSON.parse(localStorage.getItem('backup') ?? '[]');
await db.bulkPut('users', backup);
```

If you already have a raw `IDBDatabase`, `exportStore(idb, store)` and `importStore(idb, store, data)` are exported too.

## Schema Migrations

To upgrade your database schema, increment the version number. New stores are created, and new indexes are added to existing stores. Existing data is kept and indexed automatically.

```typescript
const db = new IndexedDatabase({
  dbName: 'myApp',
  version: 2, // Incremented from 1
  stores: [
    {
      name: 'users',
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'email', keyPath: 'email', unique: true },
        { name: 'age', keyPath: 'age' },
        { name: 'city', keyPath: 'city' }, // New index
      ],
    },
    {
      name: 'posts', // New store
      keyPath: 'id',
      autoIncrement: true,
    },
  ],
});
```

If another tab still has the old version open, that tab's connection closes itself so the upgrade can go ahead. If the upgrade is still blocked, `open()` rejects with a clear error instead of hanging.

## Development

```bash
npm install
npm test        # Jest + fake-indexeddb
npm run build   # outputs dist/
```

## Browser Support

Supports all modern browsers with IndexedDB:

- Chrome 24+
- Firefox 16+
- Safari 10+
- Edge 12+

## License

MIT
