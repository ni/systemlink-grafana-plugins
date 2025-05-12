
import sharedCache from './shared-cache';

describe('cache', () => {
  const cache = sharedCache;

  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should store and retrieve a value', () => {
    cache.set('foo', 'bar', 5000);
    expect(cache.get('foo')).toBe('bar');
  });

  it('should return undefined after TTL expires', () => {
    cache.set('expiredKey', 'value', 1000);
    jest.advanceTimersByTime(1500);
    expect(cache.get('expiredKey')).toBeUndefined();
  });

  it('should remove expired entries in cleanup', () => {
    cache.set('key1', 'val1', 1000);
    cache.set('key2', 'val2', 5000);

    jest.advanceTimersByTime(1500);

    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('val2');
  });

  it('should default TTL to 10 minutes if not provided', () => {
    cache.set('defaultTTL', 'value');
    expect(cache.get('defaultTTL')).toBe('value');

    jest.advanceTimersByTime(9 * 60 * 1000); // 9 minutes
    expect(cache.get('defaultTTL')).toBe('value');
  });
});
