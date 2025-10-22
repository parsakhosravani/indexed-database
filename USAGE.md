# How to Use IndexedDB Library

## Quick Start Guide

### 1. Build the Library

First, compile the TypeScript code:

```bash
npm install
npm run build
```

This creates the compiled JavaScript in the `dist/` folder.

### 2. Using in Browser (Demo)

Open the included `demo.html` file in your browser:

```bash
# Serve the files with a local server
npx serve .
# Then open http://localhost:3000/demo.html
```

Or use Python:

```bash
python3 -m http.server 8000
# Then open http://localhost:8000/demo.html
```

**The demo lets you:**

- Initialize/close/delete the database
- Add users with name, email, age, city
- Query all users or filter by criteria
- Update and delete users
- See real-time output of all operations

### 3. Using in Your Project

```typescript
import { IndexedDatabase, createKeyRange } from 'indexed-database';

// Define your data interface
interface User {
  id?: number;
  name: string;
  email: string;
  age: number;
}

// Initialize database
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

// Open connection
await db.open();

// Add data
const userId = await db.add<User>('users', {
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
});

// Get data
const user = await db.get<User>('users', userId);

// Query by index
const youngUsers = await db.getAllByIndex<User>('users', 'age', createKeyRange.lessThan(30));

// Update data
await db.put<User>('users', {
  id: userId as number,
  name: 'Alice Updated',
  email: 'alice@example.com',
  age: 31,
});

// Delete data
await db.delete('users', userId);

// Close connection
db.close();
```

### 4. Common Operations

#### Query with Filters

```typescript
// Get users over 25, limit to 10 results
const adults = await db.query<User>('users', { limit: 10 }, (user) => user.age > 25);
```

#### Transactions (Atomic Operations)

```typescript
await db.transaction(['users'], 'readwrite', async (tx, [store]) => {
  // Multiple operations happen atomically
  await db.add('users', { name: 'Bob', email: 'bob@example.com', age: 25 });
  await db.add('users', { name: 'Carol', email: 'carol@example.com', age: 28 });
});
```

#### Key Ranges

```typescript
// Between two values
const range1 = createKeyRange.between(20, 30);

// Greater than
const range2 = createKeyRange.greaterThan(25);

// Starts with (for strings)
const range3 = createKeyRange.startsWith('alice');

// Use in queries
const users = await db.getAllByIndex('users', 'age', range1);
```

### 5. Browser DevTools

To inspect your IndexedDB:

1. Open Chrome/Edge DevTools (F12)
2. Go to **Application** tab
3. Expand **IndexedDB** in the left sidebar
4. Click on your database name to view stores and data

### 6. Running Tests

```bash
npm test
```

Tests use jest with fake-indexeddb to simulate browser IndexedDB.

### 7. Examples

Check the `examples/` folder:

- `basic-usage.ts` - CRUD operations and queries
- `transaction-example.ts` - Atomic money transfer

## Troubleshooting

**"Database not opened" error**

- Make sure to call `await db.open()` before any operations

**CORS errors with demo.html**

- Don't open the file directly (file://). Use a local server instead

**Module import errors**

- Make sure you've run `npm run build` to compile TypeScript
- Use type="module" in script tags for ES6 imports

**Unique constraint errors**

- Check if you're adding duplicate values to fields marked as `unique: true`
