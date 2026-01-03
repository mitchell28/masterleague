/**
 * Simplified leaderboard caching using simple memory cache
 * Removed all complex CloudFlare KV and calculation tracking
 */

import { cache, CacheKeys as SimpleCacheKeys, CacheHelpers } from './simple-cache.js';

/**
 * Leaderboard entry type
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
}

/**
 * Simple leaderboard cache interface
 */
export interface LeaderboardData {
	totalUsers: number;
	entries: LeaderboardEntry[];
	lastUpdate: string;
}

/**
 * Simple leaderboard metadata
 */
export interface LeaderboardMeta {
	lastUpdate: string;
	lastGameTime: string | null;
}

/**
 * Simple leaderboard cache functions
 */
export class LeaderboardCache {
	// Get cached leaderboard data
	static async get(
		organizationId: string,
		season: string
	): Promise<{ data: LeaderboardEntry[]; totalUsers: number } | null> {
		const cached = cache.get<LeaderboardData>(SimpleCacheKeys.leaderboard(organizationId, season));
		if (!cached) return null;
		return { data: cached.entries || [], totalUsers: cached.totalUsers };
	}

	// Cache leaderboard data
	static async set(
		organizationId: string,
		season: string,
		leaderboardData: LeaderboardEntry[]
	): Promise<void> {
		const data: LeaderboardData = {
			totalUsers: leaderboardData.length,
			entries: leaderboardData,
			lastUpdate: new Date().toISOString()
		};
		cache.set(SimpleCacheKeys.leaderboard(organizationId, season), data, 15); // 15 minutes TTL
	}

	// Legacy alias for getData
	static async getData(organizationId: string, season: string): Promise<LeaderboardData | null> {
		return cache.get<LeaderboardData>(SimpleCacheKeys.leaderboard(organizationId, season));
	}

	// Legacy alias for setData
	static async setData(
		organizationId: string,
		season: string,
		data: LeaderboardData
	): Promise<void> {
		cache.set(SimpleCacheKeys.leaderboard(organizationId, season), data, 15); // 15 minutes TTL
	}

	// Check if leaderboard is fresh
	static isFresh(organizationId: string, season: string, withinMinutes: number = 10): boolean {
		return CacheHelpers.isLeaderboardFresh(organizationId, season, withinMinutes);
	}

	// Simple metadata handling
	static async getMeta(organizationId: string, season: string): Promise<LeaderboardMeta | null> {
		const metaKey = `${SimpleCacheKeys.leaderboard(organizationId, season)}:meta`;
		return cache.get<LeaderboardMeta>(metaKey);
	}

	static async setMeta(
		organizationId: string,
		season: string,
		meta: LeaderboardMeta
	): Promise<void> {
		const metaKey = `${SimpleCacheKeys.leaderboard(organizationId, season)}:meta`;
		cache.set(metaKey, meta, 60); // 1 hour TTL for metadata
	}

	// Clear cache for organization
	static async clear(organizationId: string, season: string): Promise<void> {
		cache.delete(SimpleCacheKeys.leaderboard(organizationId, season));
		cache.delete(`${SimpleCacheKeys.leaderboard(organizationId, season)}:meta`);
	}
}

/**
 * Simple lock mechanism (memory-based)
 */
export class LeaderboardLock {
	private static locks = new Map<string, number>();
	private static readonly LOCK_TTL = 5 * 60 * 1000; // 5 minutes

	static acquire(organizationId: string, season: string): boolean {
		const lockKey = `lock:${organizationId}:${season}`;
		const existingLock = this.locks.get(lockKey);

		// Check if lock is expired
		if (existingLock && Date.now() - existingLock > this.LOCK_TTL) {
			this.locks.delete(lockKey);
		}

		// Try to acquire lock
		if (this.locks.has(lockKey)) {
			return false; // Lock already exists
		}

		this.locks.set(lockKey, Date.now());
		return true;
	}

	static release(organizationId: string, season: string): void {
		const lockKey = `lock:${organizationId}:${season}`;
		this.locks.delete(lockKey);
	}

	static isLocked(organizationId: string, season: string): boolean {
		const lockKey = `lock:${organizationId}:${season}`;
		const existingLock = this.locks.get(lockKey);

		if (!existingLock) return false;

		// Check if lock is expired
		if (Date.now() - existingLock > this.LOCK_TTL) {
			this.locks.delete(lockKey);
			return false;
		}

		return true;
	}
}

/**
 * Check if leaderboard recalculation is needed
 * Returns true if recalculation should proceed, false if cache is fresh
 */
export async function shouldRecalculateLeaderboard(
	organizationId: string,
	season: string
): Promise<boolean> {
	// If no cache exists, recalculation is needed
	const cached = await LeaderboardCache.getData(organizationId, season);
	if (!cached) {
		console.log(`📊 No cache found, recalculation needed for ${organizationId}:${season}`);
		return true;
	}

	// If cache is older than 10 minutes, recalculation may be needed
	if (!LeaderboardCache.isFresh(organizationId, season, 10)) {
		console.log(`📊 Cache is stale, recalculation needed for ${organizationId}:${season}`);
		return true;
	}

	console.log(`📊 Cache is fresh, no recalculation needed for ${organizationId}:${season}`);
	return false;
}
