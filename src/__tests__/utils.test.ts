import { createKeyRange, isIndexedDBSupported } from '../utils';

describe('Utils', () => {
  describe('createKeyRange', () => {
    test('should create only range', () => {
      const range = createKeyRange.only(5);
      expect(range).toBeInstanceOf(IDBKeyRange);
      expect(range.lower).toBe(5);
      expect(range.upper).toBe(5);
    });

    test('should create lowerBound range', () => {
      const range = createKeyRange.lowerBound(10, false);
      expect(range).toBeInstanceOf(IDBKeyRange);
      expect(range.lower).toBe(10);
      expect(range.lowerOpen).toBe(false);
    });

    test('should create upperBound range', () => {
      const range = createKeyRange.upperBound(20, true);
      expect(range).toBeInstanceOf(IDBKeyRange);
      expect(range.upper).toBe(20);
      expect(range.upperOpen).toBe(true);
    });

    test('should create bound range', () => {
      const range = createKeyRange.bound(10, 20, false, false);
      expect(range).toBeInstanceOf(IDBKeyRange);
      expect(range.lower).toBe(10);
      expect(range.upper).toBe(20);
      expect(range.lowerOpen).toBe(false);
      expect(range.upperOpen).toBe(false);
    });

    test('should create between range', () => {
      const range = createKeyRange.between(5, 15);
      expect(range).toBeInstanceOf(IDBKeyRange);
      expect(range.lower).toBe(5);
      expect(range.upper).toBe(15);
      expect(range.lowerOpen).toBe(false);
      expect(range.upperOpen).toBe(false);
    });

    test('should create greaterThan range', () => {
      const range = createKeyRange.greaterThan(10);
      expect(range).toBeInstanceOf(IDBKeyRange);
      expect(range.lower).toBe(10);
      expect(range.lowerOpen).toBe(true);
    });

    test('should create lessThan range', () => {
      const range = createKeyRange.lessThan(10);
      expect(range).toBeInstanceOf(IDBKeyRange);
      expect(range.upper).toBe(10);
      expect(range.upperOpen).toBe(true);
    });

    test('should create startsWith range', () => {
      const range = createKeyRange.startsWith('test');
      expect(range).toBeInstanceOf(IDBKeyRange);
      expect(range.lower).toBe('test');
    });
  });

  describe('isIndexedDBSupported', () => {
    test('should return true in test environment', () => {
      expect(isIndexedDBSupported()).toBe(true);
    });
  });
});
