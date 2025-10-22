import 'fake-indexeddb/auto';
import { IndexedDatabase } from '../database';
import { IDBConfig } from '../types';

interface TestUser {
  id?: number;
  name: string;
  email: string;
  age: number;
}

describe('IndexedDatabase', () => {
  let db: IndexedDatabase;
  const dbConfig: IDBConfig = {
    dbName: 'testDB',
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
  };

  beforeEach(async () => {
    db = new IndexedDatabase(dbConfig);
    await db.open();
  });

  afterEach(() => {
    if (db.isOpen()) {
      db.close();
    }
  });

  describe('Database Operations', () => {
    test('should open database successfully', () => {
      expect(db.isOpen()).toBe(true);
      expect(db.getName()).toBe('testDB');
      expect(db.getVersion()).toBe(1);
    });

    test('should close database', () => {
      db.close();
      expect(db.isOpen()).toBe(false);
    });

    test('should delete database', async () => {
      db.close();
      await IndexedDatabase.deleteDatabase('testDB');
      // No error means success
    });
  });

  describe('CRUD Operations', () => {
    test('should add a record', async () => {
      const user: TestUser = {
        name: 'Alice',
        email: 'alice@test.com',
        age: 30,
      };
      const id = await db.add<TestUser>('users', user);
      expect(id).toBeDefined();
      expect(typeof id).toBe('number');
    });

    test('should get a record by key', async () => {
      const user: TestUser = {
        name: 'Bob',
        email: 'bob@test.com',
        age: 25,
      };
      const id = await db.add<TestUser>('users', user);
      const retrieved = await db.get<TestUser>('users', id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Bob');
      expect(retrieved?.email).toBe('bob@test.com');
      expect(retrieved?.age).toBe(25);
    });

    test('should return undefined for non-existent key', async () => {
      const result = await db.get<TestUser>('users', 999);
      expect(result).toBeUndefined();
    });

    test('should update a record with put', async () => {
      const user: TestUser = {
        name: 'Charlie',
        email: 'charlie@test.com',
        age: 35,
      };
      const id = await db.add<TestUser>('users', user);

      await db.put<TestUser>('users', {
        id: id as number,
        name: 'Charlie Updated',
        email: 'charlie@test.com',
        age: 36,
      });

      const updated = await db.get<TestUser>('users', id);
      expect(updated?.name).toBe('Charlie Updated');
      expect(updated?.age).toBe(36);
    });

    test('should delete a record', async () => {
      const user: TestUser = {
        name: 'Dave',
        email: 'dave@test.com',
        age: 40,
      };
      const id = await db.add<TestUser>('users', user);

      await db.delete('users', id);
      const deleted = await db.get<TestUser>('users', id);
      expect(deleted).toBeUndefined();
    });

    test('should get all records', async () => {
      await db.add<TestUser>('users', { name: 'User1', email: 'user1@test.com', age: 20 });
      await db.add<TestUser>('users', { name: 'User2', email: 'user2@test.com', age: 25 });
      await db.add<TestUser>('users', { name: 'User3', email: 'user3@test.com', age: 30 });

      const all = await db.getAll<TestUser>('users');
      expect(all).toHaveLength(3);
    });

    test('should clear all records', async () => {
      await db.add<TestUser>('users', { name: 'User1', email: 'user1@test.com', age: 20 });
      await db.add<TestUser>('users', { name: 'User2', email: 'user2@test.com', age: 25 });

      await db.clear('users');
      const all = await db.getAll<TestUser>('users');
      expect(all).toHaveLength(0);
    });

    test('should count records', async () => {
      await db.add<TestUser>('users', { name: 'User1', email: 'user1@test.com', age: 20 });
      await db.add<TestUser>('users', { name: 'User2', email: 'user2@test.com', age: 25 });
      await db.add<TestUser>('users', { name: 'User3', email: 'user3@test.com', age: 30 });

      const count = await db.count('users');
      expect(count).toBe(3);
    });
  });

  describe('Index Queries', () => {
    beforeEach(async () => {
      await db.add<TestUser>('users', { name: 'Alice', email: 'alice@test.com', age: 30 });
      await db.add<TestUser>('users', { name: 'Bob', email: 'bob@test.com', age: 25 });
      await db.add<TestUser>('users', { name: 'Charlie', email: 'charlie@test.com', age: 35 });
    });

    test('should get records by index', async () => {
      const users = await db.getAllByIndex<TestUser>('users', 'email', 'bob@test.com');
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('Bob');
    });

    test('should get all keys', async () => {
      const keys = await db.getAllKeys('users');
      expect(keys).toHaveLength(3);
    });
  });

  describe('Advanced Queries', () => {
    beforeEach(async () => {
      await db.add<TestUser>('users', { name: 'Alice', email: 'alice@test.com', age: 30 });
      await db.add<TestUser>('users', { name: 'Bob', email: 'bob@test.com', age: 25 });
      await db.add<TestUser>('users', { name: 'Charlie', email: 'charlie@test.com', age: 35 });
      await db.add<TestUser>('users', { name: 'Dave', email: 'dave@test.com', age: 20 });
      await db.add<TestUser>('users', { name: 'Eve', email: 'eve@test.com', age: 40 });
    });

    test('should query with custom filter', async () => {
      const adults = await db.query<TestUser>('users', {}, (user) => user.age >= 30);
      expect(adults.length).toBeGreaterThanOrEqual(3);
    });

    test('should query with limit', async () => {
      const limited = await db.query<TestUser>('users', { limit: 2 });
      expect(limited).toHaveLength(2);
    });

    test('should query with offset', async () => {
      const offset = await db.query<TestUser>('users', { offset: 2, limit: 2 });
      expect(offset).toHaveLength(2);
    });

    test('should query with index', async () => {
      const byAge = await db.query<TestUser>('users', { index: 'age' });
      expect(byAge.length).toBeGreaterThan(0);
    });
  });

  describe('Transactions', () => {
    test('should execute transaction successfully', async () => {
      await db.transaction(['users'], 'readwrite', async (tx, [store]) => {
        const user: TestUser = {
          id: 1,
          name: 'Transaction User',
          email: 'tx@test.com',
          age: 28,
        };
        const request = store.add(user);
        await new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });

      const user = await db.get<TestUser>('users', 1);
      expect(user?.name).toBe('Transaction User');
    });
  });

  describe('Error Handling', () => {
    test('should throw error when database not opened', async () => {
      const closedDb = new IndexedDatabase(dbConfig);
      await expect(closedDb.get('users', 1)).rejects.toThrow('Database not opened');
    });

    test('should throw error for invalid store name', async () => {
      await expect(db.get('invalidStore', 1)).rejects.toThrow();
    });
  });
});
