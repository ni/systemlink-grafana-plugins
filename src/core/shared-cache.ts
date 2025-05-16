/**
 * A singleton class for managing a shared in-memory cache with TTL support.
 * Automatically removes expired entries using a periodic cleanup interval.
 */
class SharedCache<T> {
  private static instance: SharedCache<any>;
  private store: Map<string, { value: T; expiresAt: number | null }> = new Map();
  private cleanupIntervalMs = 1000; // 60 seconds
  private cleanupTimer?: ReturnType<typeof setInterval>;

  private constructor() {
    this.startCleanup();
  }

  /**
   * Retrieves the singleton instance of the SharedCache.
   * If the instance does not exist, it creates one.
   * 
   * @returns {SharedCache} The singleton instance of the SharedCache.
   */
  public static getInstance<T>(): SharedCache<T> {
    if (!SharedCache.instance) {
      SharedCache.instance = new SharedCache<T>();
    }
    return SharedCache.instance;
  }

  /**
   * Retrieves a value from the cache by its key.
   * 
   * @param {string} key - The key of the cached value.
   * @returns {T} The cached value, or undefined if the key does not exist.
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    const { value, expiresAt } = entry;
    if (expiresAt !== null && Date.now() > expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return value;
  }

  /**
   * Stores a value in the cache with the specified key.
   * 
   * @param {string} key - The key to associate with the cached value.
   * @param {T} data - The value to store in the cache.
   * @param {number} [ttl] - The time-to-live (TTL) in milliseconds for the cached value.
   *                       If not provided, the default TTL is 10 minutes.
   */
  set(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? 600_000); // Default to 10 minutes
    this.store.set(key, { value: data, expiresAt });
    this.startCleanup();
  }

  /**
   * Removes expired keys from the cache.
   */
  private cleanup(): void {
    const now = Date.now();
    this.store.forEach(({ expiresAt }, key) => {
      if (expiresAt !== null && expiresAt <= now) {
        this.store.delete(key);
      }
    });

    this.checkAndStopCleanup();
  }

  /**
   * Starts periodic cleanup.
   */
  private startCleanup(): void {
    if (!this.cleanupTimer) {
      this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
    }
  }

  /**
   * Stops the cleanup timer if no entries are left in the cache.
   */
  private checkAndStopCleanup(): void {
    if (this.store.size === 0 && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

/**
 * Ensures the singleton instance of SharedCache is persisted across Hot Module Replacement (HMR).
 * This is useful during development to maintain consistent cache state when modules are reloaded.
 */
const globalForSharedCache = global as any;
globalForSharedCache.sharedCache = globalForSharedCache.sharedCache || SharedCache.getInstance();
export default globalForSharedCache.sharedCache;
