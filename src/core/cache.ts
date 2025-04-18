// sharedCache.ts
class SharedCache {
  private static instance: SharedCache;
  private store: Map<string, any> = new Map();

  private constructor() {
    console.log('SharedCache initialized');
  }

  public static getInstance(): SharedCache {
    console.log('SharedCache getInstance called');
    if (!SharedCache.instance) {
      SharedCache.instance = new SharedCache();
    }
    console.log(this.instance.store)
    return SharedCache.instance;
  }

  get(key: string): any {
    return this.store.get(key);
  }

  set(key: string, data: any) {
    this.store.set(key, data);
  }
}


// Persist the singleton instance across HMR
const globalForSharedCache = global as any;
globalForSharedCache.sharedCache = globalForSharedCache.sharedCache || SharedCache.getInstance();
export default globalForSharedCache.sharedCache;
