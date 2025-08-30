// Light caching utilities for high-performance server-side caching
// Optimized for Master League with shorter TTLs and smart invalidation

export interface LightCacheItem<T> {
	data: T;
	timestamp: number;
	ttl: number;
	tags?: string[];
}

export class LightCache {
	private cache = new Map<string, LightCacheItem<any>>();
	private readonly maxSize: number;
	private readonly defaultTTL: number;

	constructor(maxSize = 1000, defaultTTL = 300000) {
		// 5 minutes default
		this.maxSize = maxSize;
		this.defaultTTL = defaultTTL;
	}

	get<T>(key: string): T | null {
		const item = this.cache.get(key);
		if (!item) return null;

		// Check if expired
		if (Date.now() - item.timestamp > item.ttl) {
			this.cache.delete(key);
			return null;
		}

		return item.data;
	}

	set<T>(key: string, data: T, ttlMs?: number, tags?: string[]): void {
		// Evict old items if cache is full
		if (this.cache.size >= this.maxSize) {
			this.evictOldest();
		}

		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl: ttlMs || this.defaultTTL,
			tags
		});
	}

	// Get with soft refresh - returns stale data but triggers background refresh
	getSoft<T>(key: string, refreshFn?: () => Promise<T>): T | null {
		const item = this.cache.get(key);
		if (!item) return null;

		const age = Date.now() - item.timestamp;
		const isStale = age > item.ttl;
		const isSoftStale = age > item.ttl * 0.8; // 80% of TTL

		// If soft stale, trigger background refresh
		if (isSoftStale && refreshFn) {
			refreshFn()
				.then((newData) => this.set(key, newData))
				.catch((err) => console.warn('Background refresh failed:', err));
		}

		// Return data even if stale (up to 2x TTL)
		if (age < item.ttl * 2) {
			return item.data;
		}

		// Hard expire
		this.cache.delete(key);
		return null;
	}

	invalidateByTag(tag: string): number {
		let count = 0;
		for (const [key, item] of this.cache.entries()) {
			if (item.tags?.includes(tag)) {
				this.cache.delete(key);
				count++;
			}
		}
		return count;
	}

	invalidateByPattern(pattern: RegExp): number {
		let count = 0;
		for (const key of this.cache.keys()) {
			if (pattern.test(key)) {
				this.cache.delete(key);
				count++;
			}
		}
		return count;
	}

	clear(): void {
		this.cache.clear();
	}

	size(): number {
		return this.cache.size;
	}

	private evictOldest(): void {
		let oldestKey: string | null = null;
		let oldestTime = Date.now();

		for (const [key, item] of this.cache.entries()) {
			if (item.timestamp < oldestTime) {
				oldestTime = item.timestamp;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}

	// Get cache statistics
	getStats() {
		let expired = 0;
		let valid = 0;
		const now = Date.now();

		for (const item of this.cache.values()) {
			if (now - item.timestamp > item.ttl) {
				expired++;
			} else {
				valid++;
			}
		}

		return {
			total: this.cache.size,
			valid,
			expired,
			hitRate: valid / this.cache.size
		};
	}
}

// Pre-configured cache instances for different use cases
export const lightCache = {
	// Short-lived cache for frequently changing data (30 seconds - 2 minutes)
	fast: new LightCache(500, 30000),

	// Medium cache for moderately changing data (2-10 minutes)
	medium: new LightCache(1000, 120000),

	// Longer cache for stable data (10-30 minutes)
	stable: new LightCache(200, 600000)
};

// Request deduplication utility
export class RequestDeduplicator {
	private pending = new Map<string, Promise<any>>();

	async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
		// Check if request is already pending
		if (this.pending.has(key)) {
			return this.pending.get(key) as Promise<T>;
		}

		// Start new request
		const promise = fn();
		this.pending.set(key, promise);

		try {
			const result = await promise;
			return result;
		} finally {
			// Clean up after request completes
			this.pending.delete(key);
		}
	}

	clear(): void {
		this.pending.clear();
	}

	size(): number {
		return this.pending.size;
	}
}

export const requestDeduplicator = new RequestDeduplicator();
