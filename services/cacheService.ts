import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'SEOMapCacheDB';
const STORE_NAME = 'apiCacheStore';
const DB_VERSION = 1;

interface CacheEntry {
    key: string;
    value: any;
    expiry: number;
}

class CacheService {
    private memoryCache: Map<string, CacheEntry> = new Map();
    private dbPromise: Promise<IDBPDatabase>;

    constructor() {
        this.dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                }
            },
        });
    }

    private async getFromDb(key: string): Promise<any | null> {
        try {
            const db = await this.dbPromise;
            const entry: CacheEntry | undefined = await db.get(STORE_NAME, key);

            if (entry) {
                if (Date.now() < entry.expiry) {
                    // Item is valid, also add to memory cache for faster access next time
                    this.memoryCache.set(key, entry);
                    return entry.value;
                } else {
                    // Item expired, delete it
                    await db.delete(STORE_NAME, key);
                }
            }
        } catch (error) {
            console.error("Error getting item from IndexedDB:", error);
        }
        return null;
    }

    private async setToDb(key: string, value: any, ttl: number): Promise<void> {
        try {
            const db = await this.dbPromise;
            const entry: CacheEntry = {
                key,
                value,
                expiry: Date.now() + ttl * 1000,
            };
            await db.put(STORE_NAME, entry);
        } catch (error) {
            console.error("Error setting item in IndexedDB:", error);
        }
    }
    
    private generateCacheKey(context: string, params: any): string {
        try {
            const stableParams = JSON.stringify(params, Object.keys(params).sort());
            return `${context}:${stableParams}`;
        } catch (e) {
            console.error("Failed to generate cache key:", e);
            return `${context}:${Date.now()}`;
        }
    }


    public async cacheThrough<T>(
        context: string,
        params: any,
        fetchFn: () => Promise<T>,
        ttlSeconds: number = 3600 // Default to 1 hour
    ): Promise<T> {
        const key = this.generateCacheKey(context, params);

        // 1. Check in-memory cache
        const memEntry = this.memoryCache.get(key);
        if (memEntry && Date.now() < memEntry.expiry) {
            console.log(`[CACHE HIT - Memory]: ${context}`);
            return memEntry.value;
        }

        // 2. Check IndexedDB cache
        const dbValue = await this.getFromDb(key);
        if (dbValue !== null) {
            console.log(`[CACHE HIT - DB]: ${context}`);
            return dbValue;
        }

        console.log(`[CACHE MISS]: ${context}`);
        // 3. Fetch fresh data
        const freshData = await fetchFn();

        // 4. Store in both caches
        const entry: CacheEntry = {
            key,
            value: freshData,
            expiry: Date.now() + ttlSeconds * 1000,
        };
        this.memoryCache.set(key, entry);
        await this.setToDb(key, freshData, ttlSeconds);

        return freshData;
    }

    /**
     * Direct cache get - check memory then IndexedDB
     */
    public async get<T>(key: string): Promise<T | null> {
        // 1. Check in-memory cache
        const memEntry = this.memoryCache.get(key);
        if (memEntry && Date.now() < memEntry.expiry) {
            return memEntry.value as T;
        }

        // 2. Check IndexedDB cache
        const dbValue = await this.getFromDb(key);
        return dbValue as T | null;
    }

    /**
     * Direct cache set - store in both memory and IndexedDB
     */
    public async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
        const entry: CacheEntry = {
            key,
            value,
            expiry: Date.now() + ttlSeconds * 1000,
        };
        this.memoryCache.set(key, entry);
        await this.setToDb(key, value, ttlSeconds);
    }

    /**
     * Delete a specific cache entry
     */
    public async delete(key: string): Promise<void> {
        this.memoryCache.delete(key);
        try {
            const db = await this.dbPromise;
            await db.delete(STORE_NAME, key);
        } catch (error) {
            console.error("Error deleting item from IndexedDB:", error);
        }
    }

    /**
     * Clear all cache entries that match a prefix
     * Useful for clearing all SERP cache: clearByPrefix('serp:')
     */
    public async clearByPrefix(prefix: string): Promise<number> {
        let cleared = 0;

        // Clear from memory cache
        for (const key of this.memoryCache.keys()) {
            if (key.startsWith(prefix)) {
                this.memoryCache.delete(key);
                cleared++;
            }
        }

        // Clear from IndexedDB
        try {
            const db = await this.dbPromise;
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const allKeys = await store.getAllKeys();

            for (const key of allKeys) {
                if (typeof key === 'string' && key.startsWith(prefix)) {
                    await store.delete(key);
                    cleared++;
                }
            }

            await tx.done;
        } catch (error) {
            console.error("Error clearing cache by prefix:", error);
        }

        console.log(`[CACHE] Cleared ${cleared} entries with prefix: ${prefix}`);
        return cleared;
    }

    /**
     * Clear all cache entries (full reset)
     */
    public async clearAll(): Promise<void> {
        this.memoryCache.clear();
        try {
            const db = await this.dbPromise;
            await db.clear(STORE_NAME);
            console.log('[CACHE] Cleared all cache entries');
        } catch (error) {
            console.error("Error clearing all cache:", error);
        }
    }
}

// Singleton instance
export const cacheService = new CacheService();
