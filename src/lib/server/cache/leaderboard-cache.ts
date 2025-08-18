/**
 * Simplified leaderboard caching using simple memory cache
 * Removed all complex CloudFlare KV and calculation tracking
 */

import { cache, CacheKeys as SimpleCacheKeys, CacheHelpers } from './simple-cache.js';

/**
 * Simple leaderboard cache interface
 */
export interface LeaderboardData {
	totalUsers: number;
	entries: any[];
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
	static async getData(organizationId: string, season: string): Promise<LeaderboardData | null> {
		return cache.get<LeaderboardData>(SimpleCacheKeys.leaderboard(organizationId, season));
	}

	// Cache leaderboard data
	static async setData(organizationId: string, season: string, data: LeaderboardData): Promise<void> {
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

	static async setMeta(organizationId: string, season: string, meta: LeaderboardMeta): Promise<void> {
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
