# IndexedDB Wrapper

A modern, TypeScript-first wrapper for IndexedDB providing a clean, promise-based API for browser-based database operations.

## Features

- 🎯 **Type-safe**: Full TypeScript support with generics
- 🔄 **Promise-based**: Modern async/await API
- 🚀 **Simple**: Intuitive API that abstracts IndexedDB complexity
- 🔍 **Advanced querying**: Support for indexes, cursors, and key ranges
- 💾 **Transaction support**: Execute multiple operations atomically
- 📦 **Zero dependencies**: Lightweight and self-contained

## Installation

```bash
npm install indexed-database
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

### Advanced Querying

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

```typescript
await db.transaction(['users', 'posts'], 'readwrite', async (tx, [usersStore, postsStore]) => {
  // Multiple operations in one transaction
  await db.add('users', { name: 'Bob' });
  await db.add('posts', { userId: 1, content: 'Hello' });
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
import { exportStore, importStore } from 'indexed-database/utils';

// Export data
const data = await exportStore(db.db, 'users');
localStorage.setItem('backup', JSON.stringify(data));

// Import data
const backup = JSON.parse(localStorage.getItem('backup'));
await importStore(db.db, 'users', backup);
```

## Schema Migrations

To upgrade your database schema, increment the version number:

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

## Browser Support

Supports all modern browsers with IndexedDB:

- Chrome 24+
- Firefox 16+
- Safari 10+
- Edge 12+

## License

MIT
