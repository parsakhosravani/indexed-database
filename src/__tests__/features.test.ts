import 'fake-indexeddb/auto';
import { IndexedDatabase } from '../database';
import { createKeyRange } from '../utils';

interface Note {
  id?: number;
  title: string;
  tag: string;
}

const DB = 'featuresDB';

afterEach(async () => {
  await IndexedDatabase.deleteDatabase(DB);
});

describe('bulk operations', () => {
  test('bulkPut writes all records in one transaction and returns their keys', async () => {
    const db = new IndexedDatabase({
      dbName: DB,
      stores: [{ name: 'notes', keyPath: 'id', autoIncrement: true }],
    });
    await db.open();

    const keys = await db.bulkPut<Note>('notes', [
      { title: 'a', tag: 'x' },
      { title: 'b', tag: 'y' },
      { title: 'c', tag: 'x' },
    ]);

    expect(keys).toHaveLength(3);
    expect(await db.count('notes')).toBe(3);
    db.close();
  });

  test('bulkPut rolls back everything when one write fails', async () => {
    const db = new IndexedDatabase({
      dbName: DB,
      stores: [
        {
          name: 'notes',
          keyPath: 'id',
          autoIncrement: true,
          indexes: [{ name: 'title', keyPath: 'title', unique: true }],
        },
      ],
    });
    await db.open();

    await expect(
      db.bulkPut<Note>('notes', [
        { title: 'same', tag: 'x' },
        { title: 'same', tag: 'y' },
      ])
    ).rejects.toBeDefined();

    expect(await db.count('notes')).toBe(0);
    db.close();
  });

  test('bulkDelete removes the given keys', async () => {
    const db = new IndexedDatabase({
      dbName: DB,
      stores: [{ name: 'notes', keyPath: 'id', autoIncrement: true }],
    });
    await db.open();
    const keys = await db.bulkPut<Note>('notes', [
      { title: 'a', tag: 'x' },
      { title: 'b', tag: 'y' },
      { title: 'c', tag: 'z' },
    ]);

    await db.bulkDelete('notes', keys.slice(0, 2));

    const left = await db.getAll<Note>('notes');
    expect(left.map((n) => n.title)).toEqual(['c']);
    db.close();
  });
});

describe('getByIndex', () => {
  test('returns the first match or undefined', async () => {
    const db = new IndexedDatabase({
      dbName: DB,
      stores: [
        {
          name: 'notes',
          keyPath: 'id',
          autoIncrement: true,
          indexes: [{ name: 'tag', keyPath: 'tag' }],
        },
      ],
    });
    await db.open();
    await db.bulkPut<Note>('notes', [{ title: 'a', tag: 'work' }]);

    expect((await db.getByIndex<Note>('notes', 'tag', 'work'))?.title).toBe('a');
    expect(await db.getByIndex<Note>('notes', 'tag', 'home')).toBeUndefined();
    db.close();
  });
});

describe('schema upgrades', () => {
  test('adds a new index to an existing store when the version goes up', async () => {
    const v1 = new IndexedDatabase({
      dbName: DB,
      version: 1,
      stores: [{ name: 'notes', keyPath: 'id', autoIncrement: true }],
    });
    await v1.open();
    await v1.bulkPut<Note>('notes', [
      { title: 'a', tag: 'work' },
      { title: 'b', tag: 'home' },
    ]);
    v1.close();

    const v2 = new IndexedDatabase({
      dbName: DB,
      version: 2,
      stores: [
        {
          name: 'notes',
          keyPath: 'id',
          autoIncrement: true,
          indexes: [{ name: 'tag', keyPath: 'tag' }],
        },
      ],
    });
    await v2.open();

    // Existing data is kept and the new index already covers it
    const work = await v2.getAllByIndex<Note>('notes', 'tag', 'work');
    expect(work.map((n) => n.title)).toEqual(['a']);
    v2.close();
  });

  test('closes itself when another connection upgrades the database', async () => {
    const old = new IndexedDatabase({
      dbName: DB,
      version: 1,
      stores: [{ name: 'notes', keyPath: 'id' }],
    });
    await old.open();

    const newer = new IndexedDatabase({
      dbName: DB,
      version: 2,
      stores: [{ name: 'notes', keyPath: 'id' }],
    });
    await newer.open();

    expect(old.isOpen()).toBe(false);
    expect(newer.isOpen()).toBe(true);
    newer.close();
  });
});

describe('query with a range', () => {
  test('only visits index values inside the range, then applies offset and limit', async () => {
    const db = new IndexedDatabase({
      dbName: DB,
      stores: [
        {
          name: 'notes',
          keyPath: 'id',
          autoIncrement: true,
          indexes: [{ name: 'title', keyPath: 'title' }],
        },
      ],
    });
    await db.open();
    await db.bulkPut<Note>('notes', [
      { title: 'a', tag: '' },
      { title: 'b', tag: '' },
      { title: 'c', tag: '' },
      { title: 'd', tag: '' },
      { title: 'e', tag: '' },
    ]);

    const inRange = await db.query<Note>('notes', {
      index: 'title',
      range: createKeyRange.between('b', 'e'),
      offset: 1,
      limit: 2,
    });
    expect(inRange.map((n) => n.title)).toEqual(['c', 'd']);

    const reversed = await db.query<Note>('notes', {
      index: 'title',
      range: createKeyRange.lessThan('c'),
      direction: 'prev',
    });
    expect(reversed.map((n) => n.title)).toEqual(['b', 'a']);
    db.close();
  });
});

describe('createKeyRange.startsWith', () => {
  test('matches strings with the prefix and nothing else', async () => {
    const db = new IndexedDatabase({
      dbName: DB,
      stores: [
        {
          name: 'notes',
          keyPath: 'id',
          autoIncrement: true,
          indexes: [{ name: 'title', keyPath: 'title' }],
        },
      ],
    });
    await db.open();
    await db.bulkPut<Note>('notes', [
      { title: 'apple', tag: '' },
      { title: 'apricot', tag: '' },
      { title: 'banana', tag: '' },
      { title: 'ap', tag: '' },
    ]);

    const ap = await db.getAllByIndex<Note>('notes', 'title', createKeyRange.startsWith('ap'));
    expect(ap.map((n) => n.title).sort()).toEqual(['ap', 'apple', 'apricot']);

    const all = await db.getAllByIndex<Note>('notes', 'title', createKeyRange.startsWith(''));
    expect(all).toHaveLength(4);
    db.close();
  });
});
