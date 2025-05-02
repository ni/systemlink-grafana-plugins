
import sharedCache from './shared-cache';

describe('SharedCache', () => {
  const cache = sharedCache;

  it('should store and retrieve a value by key', () => {
    const key = 'testKey';
    const value = 'testValue';

    cache.set(key, value);
    const retrievedValue = cache.get(key);

    expect(retrievedValue).toBe(value);
  });

  it('should return undefined for a non-existent key', () => {
    const nonExistentKey = 'nonExistentKey';
    const retrievedValue = cache.get(nonExistentKey);

    expect(retrievedValue).toBeUndefined();
  });

  it('should overwrite an existing key with a new value', () => {
    const key = 'testKey';
    const initialValue = 'initialValue';
    const newValue = 'newValue';

    cache.set(key, initialValue);
    cache.set(key, newValue);
    const retrievedValue = cache.get(key);

    expect(retrievedValue).toBe(newValue);
  });

  it('should persist the singleton instance across HMR', () => {
    const globalCache = (global as any).sharedCache;
    expect(globalCache).toBe(cache);
  });
});
