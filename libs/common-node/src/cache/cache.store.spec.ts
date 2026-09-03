import { InMemoryCacheStore, setCacheStore } from './cache.store';

describe('Cache Store - BUG #90 fix', () => {
  let store: InMemoryCacheStore;

  beforeEach(() => {
    store = new InMemoryCacheStore();
    setCacheStore(store);
  });

  afterEach(() => {
    store.destroy();
  });

  describe('get/set', () => {
    it('should_returnCached_When_setThenGet', async () => {
      await store.set('key1', { foo: 'bar' }, 60);
      const result = await store.get('key1');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should_returnNull_When_expired', async () => {
      await store.set('key1', 'value', 0.05); // 50ms
      await new Promise((resolve) => setTimeout(resolve, 100));
      const result = await store.get('key1');
      expect(result).toBe(null);
    });

    it('should_returnNull_When_keyMissing', async () => {
      const result = await store.get('missing');
      expect(result).toBe(null);
    });
  });

  describe('delete', () => {
    it('should_remove_When_deleteCalled', async () => {
      await store.set('key1', 'value', 60);
      await store.delete('key1');
      const result = await store.get('key1');
      expect(result).toBe(null);
    });
  });

  describe('deletePattern', () => {
    it('should_deleteMatching_When_pattern', async () => {
      await store.set('topic-tree:1', 'a', 60);
      await store.set('topic-tree:2', 'b', 60);
      await store.set('question:1', 'c', 60);

      const count = await store.deletePattern('topic-tree:*');
      expect(count).toBe(2);

      expect(await store.get('topic-tree:1')).toBe(null);
      expect(await store.get('question:1')).toBe('c');
    });
  });

  describe('LRU eviction', () => {
    it('should_evictOldest_When_atCapacity', async () => {
      const small = new InMemoryCacheStore(3);
      await small.set('a', 1, 60);
      await small.set('b', 2, 60);
      await small.set('c', 3, 60);
      await small.set('d', 4, 60);

      expect(await small.get('a')).toBe(null);
      expect(await small.get('d')).toBe(4);
      small.destroy();
    });
  });

  describe('clear', () => {
    it('should_removeAll_When_clearCalled', async () => {
      await store.set('k1', 'v1', 60);
      await store.set('k2', 'v2', 60);
      await store.clear();
      expect(await store.get('k1')).toBe(null);
      expect(await store.get('k2')).toBe(null);
    });
  });
});
