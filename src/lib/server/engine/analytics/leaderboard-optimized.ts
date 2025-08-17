import { db } from '$lib/server/db';
import { user, organization } from '$lib/server/db/auth/auth-schema';
import { fixtures, predictions, leagueTable, leaderboardMeta } from '$lib/server/db/schema';
import { eq, and, inArray, desc, gte } from 'drizzle-orm';
import {
	LeaderboardCache,
	LeaderboardLock,
	shouldRecalculateLeaderboard,
	type LeaderboardEntry
} from '../../cache/leaderboard-cache-optimized.js';

/**
 * Recalculation result interface
 */
export interface RecalculationResult {
	success: boolean;
	organizationId: string;
	season: string;
	usersUpdated: number;
	totalMatches: number;
	finishedMatches: number;
	lastGameTime: Date | null;
	executionTime: number;
	fromCache: boolean;
	message: string;
}

/**
 * Optimized leaderboard calculation with better caching and performance
 */
export async function recalculateLeaderboardOptimized(
	organizationId: string,
	season: string = '2025', // Match the actual season format in fixtures
	forceRecalculation: boolean = false
): Promise<RecalculationResult> {
	const startTime = Date.now();

	try {
		// Quick cache check first (unless forced)
		if (!forceRecalculation) {
			const shouldRecalc = await shouldRecalculateLeaderboard(organizationId, season);
			if (!shouldRecalc) {
				const cached = await LeaderboardCache.get(organizationId, season);
				if (cached?.data && cached.data.length > 0) {
					return {
						success: true,
						organizationId,
						season,
						usersUpdated: cached.totalUsers || 0,
						totalMatches: 0,
						finishedMatches: 0,
						lastGameTime: null,
						executionTime: Date.now() - startTime,
						fromCache: true,
						message: 'Leaderboard is up to date (from cache)'
					};
				}
			}
		}

		// Try to acquire lock
		const lockAcquired = await LeaderboardLock.acquire(organizationId, season);
		if (!lockAcquired) {
			// Wait a bit and try to get cached data
			await new Promise((resolve) => setTimeout(resolve, 100));
			const cached = await LeaderboardCache.get(organizationId, season);

			return {
				success: false,
				organizationId,
				season,
				usersUpdated: cached?.totalUsers || 0,
				totalMatches: 0,
				finishedMatches: 0,
				lastGameTime: null,
				executionTime: Date.now() - startTime,
				fromCache: !!cached,
				message: 'Another recalculation is in progress'
			};
		}

		try {
			// Set calculating flag immediately
			await LeaderboardCache.setMeta(organizationId, season, {
				isCalculating: true,
				lastLeaderboardUpdate: new Date().toISOString()
			});

			// Get fixtures for stats
			const allFixtures = await db
				.select({
					id: fixtures.id,
					status: fixtures.status,
					matchDate: fixtures.matchDate
				})
				.from(fixtures)
				.where(and(eq(fixtures.season, season)));

			const totalMatches = allFixtures.length;
			const finishedMatches = allFixtures.filter(
				(f) => f.status.toLowerCase() === 'finished'
			).length;
			const lastGameTime = allFixtures
				.filter((f) => f.status.toLowerCase() === 'finished')
				.reduce(
					(latest, fixture) => {
						return !latest || fixture.matchDate > latest ? fixture.matchDate : latest;
					},
					null as Date | null
				);

			console.log(`📊 Found ${totalMatches} fixtures, ${finishedMatches} finished`);

			// Use the optimized query with indexes we added
			const leaderboardData = await db
				.select({
					userId: leagueTable.userId,
					userName: user.name,
					userEmail: user.email,
					totalPoints: leagueTable.totalPoints,
					correctScorelines: leagueTable.correctScorelines,
					correctOutcomes: leagueTable.correctOutcomes,
					predictedFixtures: leagueTable.predictedFixtures,
					completedFixtures: leagueTable.completedFixtures,
					lastUpdated: leagueTable.lastUpdated
				})
				.from(leagueTable)
				.innerJoin(user, eq(leagueTable.userId, user.id))
				.where(and(eq(leagueTable.organizationId, organizationId), eq(leagueTable.season, season)))
				.orderBy(
					desc(leagueTable.totalPoints),
					desc(leagueTable.correctScorelines),
					desc(leagueTable.correctOutcomes)
				);

			console.log(`📈 Query returned ${leaderboardData.length} users`);

			// Transform to cache format
			const cacheEntries: LeaderboardEntry[] = leaderboardData.map((row) => ({
				userId: row.userId,
				userName: row.userName || 'Unknown User',
				userEmail: row.userEmail || '',
				totalPoints: row.totalPoints,
				correctScorelines: row.correctScorelines,
				correctOutcomes: row.correctOutcomes,
				predictedFixtures: row.predictedFixtures || 0,
				completedFixtures: row.completedFixtures || 0,
				lastUpdated: row.lastUpdated.toISOString()
			}));

			// Cache the results with optimized cache
			await LeaderboardCache.set(organizationId, season, cacheEntries);

			// Update metadata cache
			await LeaderboardCache.setMeta(organizationId, season, {
				lastLeaderboardUpdate: new Date().toISOString(),
				lastGameTime: lastGameTime?.toISOString() || null,
				totalMatches,
				finishedMatches,
				isCalculating: false
			});

			// Update database metadata
			try {
				await db
					.insert(leaderboardMeta)
					.values({
						id: `${organizationId}:${season}`,
						organizationId,
						season,
						lastLeaderboardUpdate: new Date(),
						totalMatches,
						finishedMatches,
						lastGameTime,
						isLocked: false,
						createdAt: new Date(),
						updatedAt: new Date()
					})
					.onConflictDoUpdate({
						target: leaderboardMeta.id,
						set: {
							lastLeaderboardUpdate: new Date(),
							totalMatches,
							finishedMatches,
							lastGameTime,
							isLocked: false,
							updatedAt: new Date()
						}
					});
				console.log(`📝 Database metadata updated`);
			} catch (dbError) {
				console.warn(`⚠️ Database metadata update failed:`, dbError);
				// Don't fail the whole operation for metadata update issues
			}

			const executionTime = Date.now() - startTime;
			console.log(`✅ Recalculation completed in ${executionTime}ms`);

			return {
				success: true,
				organizationId,
				season,
				usersUpdated: cacheEntries.length,
				totalMatches,
				finishedMatches,
				lastGameTime,
				executionTime,
				fromCache: false,
				message: `Leaderboard recalculated successfully for ${cacheEntries.length} users in ${executionTime}ms`
			};
		} finally {
			// Always release the lock
			await LeaderboardLock.release(organizationId, season);
			console.log(`🔓 Lock released for ${organizationId}:${season}`);
		}
	} catch (error) {
		console.error(`❌ Error recalculating leaderboard:`, error);

		// Try to clean up metadata on error
		try {
			await LeaderboardCache.setMeta(organizationId, season, {
				isCalculating: false,
				lastLeaderboardUpdate: new Date().toISOString()
			});
		} catch (cleanupError) {
			console.error(`❌ Error cleaning up metadata:`, cleanupError);
		}

		return {
			success: false,
			organizationId,
			season,
			usersUpdated: 0,
			totalMatches: 0,
			finishedMatches: 0,
			lastGameTime: null,
			executionTime: Date.now() - startTime,
			fromCache: false,
			message: `Failed to recalculate leaderboard: ${error instanceof Error ? error.message : 'Unknown error'}`
		};
	}
}

/**
 * Optimized leaderboard retrieval with smart caching
 */
export async function getLeaderboardOptimized(
	organizationId: string,
	season: string = '2025' // Match the actual season format in fixtures
): Promise<LeaderboardEntry[]> {
	// Try to get from cache first (includes memory cache)
	const cached = await LeaderboardCache.get(organizationId, season);
	if (cached && cached.data.length > 0) {
		return cached.data;
	}

	// For cold starts: First try to get any existing data quickly (database)
	// Then trigger background processing to populate cache for future requests
	const quickData = await getLeaderboardFromDatabase(organizationId, season);

	if (quickData.length > 0) {
		// Trigger background recalculation to populate cache for future requests
		// but don't wait for it (non-blocking)
		Promise.resolve().then(async () => {
			try {
				const shouldRecalc = await shouldRecalculateLeaderboard(organizationId, season);
				if (shouldRecalc) {
					await recalculateLeaderboardOptimized(organizationId, season, false);
				}
			} catch (error) {
				console.error(`Background recalculation failed:`, error);
			}
		});

		return quickData;
	}

	// If no data in leagueTable either, then we need to force a calculation
	const result = await recalculateLeaderboardOptimized(organizationId, season, true);

	if (result.success) {
		// Try to get fresh cache data
		const fresh = await LeaderboardCache.get(organizationId, season);
		if (fresh?.data && fresh.data.length > 0) {
			return fresh.data;
		}
	}

	// Final fallback
	return [];
}

/**
 * Direct database query for leaderboard (emergency fallback)
 */
async function getLeaderboardFromDatabase(
	organizationId: string,
	season: string
): Promise<LeaderboardEntry[]> {
	const dbResult = await db
		.select({
			userId: leagueTable.userId,
			userName: user.name,
			userEmail: user.email,
			totalPoints: leagueTable.totalPoints,
			correctScorelines: leagueTable.correctScorelines,
			correctOutcomes: leagueTable.correctOutcomes,
			predictedFixtures: leagueTable.predictedFixtures,
			completedFixtures: leagueTable.completedFixtures,
			lastUpdated: leagueTable.lastUpdated
		})
		.from(leagueTable)
		.innerJoin(user, eq(leagueTable.userId, user.id))
		.where(and(eq(leagueTable.organizationId, organizationId), eq(leagueTable.season, season)))
		.orderBy(
			desc(leagueTable.totalPoints),
			desc(leagueTable.correctScorelines),
			desc(leagueTable.correctOutcomes)
		);

	const result = dbResult.map((row, index) => ({
		userId: row.userId,
		userName: row.userName || 'Unknown User',
		userEmail: row.userEmail || '',
		totalPoints: row.totalPoints,
		correctScorelines: row.correctScorelines,
		correctOutcomes: row.correctOutcomes,
		predictedFixtures: row.predictedFixtures || 0,
		completedFixtures: row.completedFixtures || 0,
		lastUpdated: row.lastUpdated.toISOString(),
		rank: index + 1
	}));

	// Background cache update with the database result
	if (result.length > 0) {
		updateCacheInBackground(organizationId, season, result).catch((err: unknown) => {
			console.error(`Background cache update failed:`, err);
		});
	}

	return result;
}

/**
 * Updates cache in background without blocking the main request
 */
async function updateCacheInBackground(
	organizationId: string,
	season: string,
	leaderboardData: LeaderboardEntry[]
): Promise<void> {
	try {
		await LeaderboardCache.set(organizationId, season, leaderboardData);

		await LeaderboardCache.setMeta(organizationId, season, {
			lastLeaderboardUpdate: new Date().toISOString(),
			isCalculating: false
		});
	} catch (error) {
		console.error(`Background cache update failed for org: ${organizationId}:`, error);
	}
}
