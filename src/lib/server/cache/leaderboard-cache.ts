import { kv } from './cloudflare-kv.js';

/**
 * In-memory cache to handle KV eventual consistency issues
 * This provides immediate access to recently set values
 */
class MemoryCache {
	private cache = new Map<string, { value: any; expiry: number }>();
	private readonly TTL = 5 * 60 * 1000; // 5 minutes in memory

	set(key: string, value: any): void {
		this.cache.set(key, {
			value,
			expiry: Date.now() + this.TTL
		});
	}

	get(key: string): any | null {
		const item = this.cache.get(key);
		if (!item) return null;

		if (Date.now() > item.expiry) {
			this.cache.delete(key);
			return null;
		}

		return item.value;
	}

	delete(key: string): void {
		this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}
}

const memoryCache = new MemoryCache();

/**
 * Cache key generators for consistent naming
 */
export const CacheKeys = {
	leaderboard: (organizationId: string, season: string) =>
		`leaderboard:${organizationId}:${season}`,
	leaderboardMeta: (organizationId: string, season: string) =>
		`leaderboard:meta:${organizationId}:${season}`,
	leaderboardLock: (organizationId: string, season: string) =>
		`leaderboard:lock:${organizationId}:${season}`,
	currentWeek: () => `current:week`,
	predictionCache: (organizationId: string, userId: string, weekId: number) =>
		`predictions:${organizationId}:${userId}:${weekId}`
};

/**
 * Leaderboard data structure for caching
 */
export interface LeaderboardEntry {
	userId: string;
	userName: string;
	userEmail: string;
	totalPoints: number;
	correctScorelines: number;
	correctOutcomes: number;
	predictedFixtures: number;
	completedFixtures: number;
	lastUpdated: string;
	rank?: number;
}

export interface LeaderboardCache {
	data: LeaderboardEntry[];
	lastUpdated: string;
	organizationId: string;
	season: string;
	totalUsers: number;
}

/**
 * Leaderboard metadata structure
 */
export interface LeaderboardMetaCache {
	lastLeaderboardUpdate: string;
	lastGameTime: string | null;
	totalMatches: number;
	finishedMatches: number;
	isCalculating: boolean;
}

/**
 * Lock management with improved handling
 */
export class LeaderboardLock {
	private static readonly LOCK_TTL = 120; // 2 minutes for safety

	/**
	 * Acquire a lock for leaderboard recalculation
	 */
	static async acquire(organizationId: string, season: string): Promise<boolean> {
		const lockKey = CacheKeys.leaderboardLock(organizationId, season);

		// Check memory cache first for immediate consistency
		if (memoryCache.get(lockKey)) {
			return false;
		}

		const existing = await kv.get(lockKey);

		if (existing) {
			// Update memory cache to prevent immediate retry
			memoryCache.set(lockKey, existing);
			return false;
		}

		const lockData = {
			acquiredAt: new Date().toISOString(),
			organizationId,
			season
		};

		const success = await kv.set(lockKey, lockData, { ttl: this.LOCK_TTL });

		if (success) {
			// Store in memory cache for immediate access
			memoryCache.set(lockKey, lockData);
		}

		return success;
	}

	/**
	 * Release a lock
	 */
	static async release(organizationId: string, season: string): Promise<boolean> {
		const lockKey = CacheKeys.leaderboardLock(organizationId, season);

		// Remove from memory cache
		memoryCache.delete(lockKey);

		return await kv.delete(lockKey);
	}

	/**
	 * Check if a lock is held
	 */
	static async isLocked(organizationId: string, season: string): Promise<boolean> {
		const lockKey = CacheKeys.leaderboardLock(organizationId, season);

		// Check memory cache first
		if (memoryCache.get(lockKey)) {
			return true;
		}

		const lock = await kv.get(lockKey);

		if (lock) {
			// Update memory cache
			memoryCache.set(lockKey, lock);
			return true;
		}

		return false;
	}
}

/**
 * Optimized leaderboard cache management
 */
export class LeaderboardCache {
	/**
	 * Get leaderboard data from cache with essential debugging
	 */
	static async get(organizationId: string, season: string): Promise<LeaderboardCache | null> {
		const cacheKey = CacheKeys.leaderboard(organizationId, season);

		// Check memory cache first
		const memoryCached = memoryCache.get(cacheKey);
		if (memoryCached !== null) {
			return memoryCached;
		}

		// Check KV cache
		const kvCached = await kv.get<LeaderboardCache>(cacheKey);

		if (kvCached !== null) {
			// Store in memory for next time
			memoryCache.set(cacheKey, kvCached);
			return kvCached;
		}

		// No cache data available
		return null;
	} /**
	 * Set leaderboard cache data with immediate memory storage
	 */
	static async set(
		organizationId: string,
		season: string,
		data: LeaderboardEntry[]
	): Promise<boolean> {
		const cacheKey = CacheKeys.leaderboard(organizationId, season);
		const cacheData: LeaderboardCache = {
			data: data.map((entry, index) => ({ ...entry, rank: index + 1 })),
			lastUpdated: new Date().toISOString(),
			organizationId,
			season,
			totalUsers: data.length
		};

		// Store in memory immediately for instant access
		memoryCache.set(cacheKey, cacheData);

		// Cache for 6 hours in KV (21600 seconds) - longer persistence
		const success = await kv.set(cacheKey, cacheData, { ttl: 21600 });

		if (!success) {
			console.warn(`❌ Failed to set KV cache for ${cacheKey}, but memory cache is available`);
		}

		return true; // Return true since memory cache is set
	}

	/**
	 * Get leaderboard metadata with memory fallback
	 */
	static async getMeta(
		organizationId: string,
		season: string
	): Promise<LeaderboardMetaCache | null> {
		try {
			const metaKey = CacheKeys.leaderboardMeta(organizationId, season);

			// Try memory cache first
			const memResult = memoryCache.get(metaKey);
			if (memResult) {
				return memResult;
			}

			const result = await kv.get<LeaderboardMetaCache>(metaKey);

			if (!result) {
				return null;
			}

			// Store in memory for immediate access
			memoryCache.set(metaKey, result);
			return result;
		} catch (error) {
			console.error(`Failed to get leaderboard meta for ${organizationId}:${season}:`, error);
			return null;
		}
	}

	/**
	 * Set leaderboard metadata with immediate memory storage
	 */
	static async setMeta(
		organizationId: string,
		season: string,
		meta: Partial<LeaderboardMetaCache>
	): Promise<boolean> {
		const metaKey = CacheKeys.leaderboardMeta(organizationId, season);
		const existingMeta = await this.getMeta(organizationId, season);

		const updatedMeta: LeaderboardMetaCache = {
			lastLeaderboardUpdate: new Date().toISOString(),
			lastGameTime: null,
			totalMatches: 0,
			finishedMatches: 0,
			isCalculating: false,
			...existingMeta,
			...meta
		};

		// Store in memory immediately
		memoryCache.set(metaKey, updatedMeta);

		// Cache metadata for 24 hours in KV
		const success = await kv.set(metaKey, updatedMeta, { ttl: 86400 });

		if (!success) {
			console.warn(`Failed to set KV meta for ${metaKey}, but memory cache is available`);
		}

		return true; // Return true since memory cache is set
	}

	/**
	 * Invalidate all leaderboard cache for an organization
	 */
	static async invalidate(organizationId: string, season: string): Promise<boolean> {
		const cacheKey = CacheKeys.leaderboard(organizationId, season);
		const metaKey = CacheKeys.leaderboardMeta(organizationId, season);

		// Clear memory cache immediately
		memoryCache.delete(cacheKey);
		memoryCache.delete(metaKey);

		// Clear KV cache
		const results = await Promise.all([kv.delete(cacheKey), kv.delete(metaKey)]);

		return results.every((result) => result);
	}
}

/**
 * Helper function to check if recalculation is needed
 */
export async function shouldRecalculateLeaderboard(
	organizationId: string,
	season: string,
	lastGameFinishedAt?: Date
): Promise<boolean> {
	// Check if locked
	if (await LeaderboardLock.isLocked(organizationId, season)) {
		console.log(`🔒 Leaderboard is locked for ${organizationId}:${season}`);
		return false;
	}

	const meta = await LeaderboardCache.getMeta(organizationId, season);

	// If no meta exists, recalculation is needed
	if (!meta) {
		console.log(`📊 No meta found, recalculation needed for ${organizationId}:${season}`);
		return true;
	}

	// If currently calculating, skip
	if (meta.isCalculating) {
		console.log(`⏳ Already calculating for ${organizationId}:${season}`);
		return false;
	}

	// If a new game has finished since last update
	if (lastGameFinishedAt && meta.lastGameTime) {
		const lastGameTime = new Date(meta.lastGameTime);
		if (lastGameFinishedAt > lastGameTime) {
			console.log(`🎮 New game finished, recalculation needed for ${organizationId}:${season}`);
			return true;
		}
	}

	// If leaderboard is older than 5 minutes, allow recalculation
	const lastUpdate = new Date(meta.lastLeaderboardUpdate);
	const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

	const shouldRecalc = lastUpdate < fiveMinutesAgo;
	if (shouldRecalc) {
		console.log(`⏰ Cache is stale (>5min), recalculation needed for ${organizationId}:${season}`);
	} else {
		console.log(`✅ Cache is fresh for ${organizationId}:${season}`);
	}

	return shouldRecalc;
}

/**
 * Cached getCurrentWeek function with 30-minute TTL
 * This prevents repeated database queries for the current week
 */
export class CurrentWeekCache {
	static async get(): Promise<number> {
		const cacheKey = CacheKeys.currentWeek();

		// Check memory cache first
		const memoryCached = memoryCache.get(cacheKey);
		if (memoryCached !== null) {
			return memoryCached;
		}

		// Check KV cache
		const kvCached = await kv.get<number>(cacheKey);

		if (kvCached !== null) {
			// Store in memory for next time
			memoryCache.set(cacheKey, kvCached);
			return kvCached;
		}

		// Import and call the original function
		const { getCurrentWeek } = await import('../engine/data/fixtures/fixtureUtils.js');

		const currentWeek = await getCurrentWeek();

		// Cache for 30 minutes (week doesn't change that often)
		const ttl = 30 * 60; // 30 minutes
		await kv.set(cacheKey, currentWeek, { ttl });
		memoryCache.set(cacheKey, currentWeek);

		return currentWeek;
	}

	static async invalidate(): Promise<void> {
		const cacheKey = CacheKeys.currentWeek();
		memoryCache.delete(cacheKey);
		await kv.delete(cacheKey);
	}
}
