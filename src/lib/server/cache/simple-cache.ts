/**
 * Ultra-simple cache system for leaderboard and predictions
 * No complex logic, just TTL-based memory cache
 */

interface CacheItem<T> {
	data: T;
	timestamp: number;
	ttl: number;
}

class SimpleCache {
	private cache = new Map<string, CacheItem<any>>();

	// Cache with custom TTL (in minutes)
	set<T>(key: string, data: T, ttlMinutes: number = 10): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl: ttlMinutes * 60 * 1000
		});
	}

	// Get from cache if not expired
	get<T>(key: string): T | null {
		const item = this.cache.get(key);
		if (!item) return null;

		if (Date.now() - item.timestamp > item.ttl) {
			this.cache.delete(key);
			return null;
		}

		return item.data;
	}

	// Check if cache is fresh (within TTL)
	isFresh(key: string): boolean {
		const item = this.cache.get(key);
		if (!item) return false;
		return Date.now() - item.timestamp < item.ttl;
	}

	// Get age of cached item in minutes
	getAge(key: string): number | null {
		const item = this.cache.get(key);
		if (!item) return null;
		return Math.floor((Date.now() - item.timestamp) / (60 * 1000));
	}

	// Clear specific key
	delete(key: string): void {
		this.cache.delete(key);
	}

	// Clear all cache
	clear(): void {
		this.cache.clear();
	}

	// Get cache stats
	getStats(): { size: number; keys: string[] } {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys())
		};
	}
}

// Single global cache instance
export const cache = new SimpleCache();

// Simple cache keys
export const CacheKeys = {
	leaderboard: (orgId: string, season: string) => `leaderboard:${orgId}:${season}`,
	predictions: (week: number) => `predictions:week:${week}`,
	fixtures: (week: number) => `fixtures:week:${week}`,
	cronJob: (jobName: string) => `cron:${jobName}`,
	liveGame: (fixtureId: string) => `live:${fixtureId}`
};

// Simple cache helpers
export const CacheHelpers = {
	// Check if a cron job ran recently (default 5 minutes)
	cronRanRecently: (jobName: string, withinMinutes: number = 5): boolean => {
		const age = cache.getAge(CacheKeys.cronJob(jobName));
		return age !== null && age < withinMinutes;
	},

	// Mark a cron job as completed
	markCronCompleted: (jobName: string): void => {
		cache.set(CacheKeys.cronJob(jobName), { completed: new Date() }, 60); // Cache for 1 hour
	},

	// Check if leaderboard is fresh (default 10 minutes)
	isLeaderboardFresh: (orgId: string, season: string, withinMinutes: number = 10): boolean => {
		const age = cache.getAge(CacheKeys.leaderboard(orgId, season));
		return age !== null && age < withinMinutes;
	},

	// Cache leaderboard data
	cacheLeaderboard: (orgId: string, season: string, data: any): void => {
		cache.set(CacheKeys.leaderboard(orgId, season), data, 15); // Cache for 15 minutes
	},

	// Get cached leaderboard
	getLeaderboard: (orgId: string, season: string): any | null => {
		return cache.get(CacheKeys.leaderboard(orgId, season));
	}
};
