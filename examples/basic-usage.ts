/**
 * Basic usage example for IndexedDB wrapper
 */

import { IndexedDatabase, createKeyRange } from '../src';

interface User {
  id?: number;
  name: string;
  email: string;
  age: number;
  city: string;
}

async function main() {
  // Initialize database
  const db = new IndexedDatabase({
    dbName: 'exampleDB',
    version: 1,
    stores: [
      {
        name: 'users',
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
          { name: 'email', keyPath: 'email', unique: true },
          { name: 'age', keyPath: 'age' },
          { name: 'city', keyPath: 'city' },
        ],
      },
    ],
  });

  // Open database
  await db.open();
  console.log('Database opened');

  // Add users
  const user1Id = await db.add<User>('users', {
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
    city: 'New York',
  });
  console.log('Added user with ID:', user1Id);

  await db.add<User>('users', {
    name: 'Bob',
    email: 'bob@example.com',
    age: 25,
    city: 'San Francisco',
  });

  await db.add<User>('users', {
    name: 'Charlie',
    email: 'charlie@example.com',
    age: 35,
    city: 'New York',
  });

  // Get single user
  const user = await db.get<User>('users', user1Id);
  console.log('Retrieved user:', user);

  // Get all users
  const allUsers = await db.getAll<User>('users');
  console.log('All users:', allUsers);

  // Query by index
  const nyUsers = await db.getAllByIndex<User>('users', 'city', 'New York');
  console.log('Users in New York:', nyUsers);

  // Query with key range
  const youngUsers = await db.getAllByIndex<User>('users', 'age', createKeyRange.lessThan(30));
  console.log('Users under 30:', youngUsers);

  // Advanced query with filter and pagination
  const filteredUsers = await db.query<User>(
    'users',
    { limit: 2, offset: 0 },
    (user) => user.age > 25
  );
  console.log('Filtered users (age > 25, limit 2):', filteredUsers);

  // Update user
  await db.put<User>('users', {
    id: user1Id as number,
    name: 'Alice Updated',
    email: 'alice@example.com',
    age: 31,
    city: 'Boston',
  });
  console.log('Updated user');

  // Count users
  const count = await db.count('users');
  console.log('Total users:', count);

  // Delete user
  await db.delete('users', user1Id);
  console.log('Deleted user');

  // Clear all users
  // await db.clear('users');
  // console.log('Cleared all users');

  // Close database
  db.close();
  console.log('Database closed');
}

main().catch(console.error);
