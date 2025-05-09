/**
 * A singleton class for managing a shared in-memory cache.
 * This class ensures that only one instance of the cache exists across the application.
 */
class SharedCache {
  private static instance: SharedCache; // Holds the singleton instance
  private store: Map<string, any> = new Map(); // Internal storage for cached data

  /**
   * Retrieves the singleton instance of the SharedCache.
   * If the instance does not exist, it creates one.
   * 
   * @returns {SharedCache} The singleton instance of the SharedCache.
   */
  public static getInstance(): SharedCache {
    if (!SharedCache.instance) {
      SharedCache.instance = new SharedCache();
    }
    return SharedCache.instance;
  }

  /**
   * Retrieves a value from the cache by its key.
   * 
   * @param {string} key - The key of the cached value.
   * @returns {any} The cached value, or undefined if the key does not exist.
   */
  get(key: string): any {
    return this.store.get(key);
  }

  /**
   * Stores a value in the cache with the specified key.
   * 
   * @param {string} key - The key to associate with the cached value.
   * @param {any} data - The value to store in the cache.
   */
  set(key: string, data: any): void {
    this.store.set(key, data);
  }

  /**
   * Clears all key-value pairs from the cache.
   */
  clear(): void {
    this.store.clear();
  }
}

/**
 * Ensures the singleton instance of SharedCache is persisted across Hot Module Replacement (HMR).
 * This is useful during development to maintain consistent cache state when modules are reloaded.
 */
const globalForSharedCache = global as any;
globalForSharedCache.sharedCache = globalForSharedCache.sharedCache || SharedCache.getInstance();
export default globalForSharedCache.sharedCache; 
