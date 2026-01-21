import { db } from '../db/index.js';
import { fixtures, predictions, leagueTable, leaderboardMeta } from '../db/schema.js';
import { user as authUser } from '../db/auth/auth-schema.js';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import {
	LeaderboardCache,
	LeaderboardLock,
	shouldRecalculateLeaderboard,
	type LeaderboardEntry
} from '../cache/leaderboard-cache.js';
import { randomUUID } from 'crypto';

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
 * Recalculate leaderboard for a specific organization and season
 * Moved from background folder - this is a core football calculation function
 */
export async function recalculateLeaderboard(
	organizationId: string,
	season: string = '2025-26',
	forceRecalculation: boolean = false
): Promise<RecalculationResult> {
	const startTime = Date.now();

	try {
		// Check if recalculation is needed (unless forced)
		if (!forceRecalculation && !(await shouldRecalculateLeaderboard(organizationId, season))) {
			const cached = await LeaderboardCache.get(organizationId, season);
			return {
				success: true,
				organizationId,
				season,
				usersUpdated: cached?.totalUsers || 0,
				totalMatches: 0,
				finishedMatches: 0,
				lastGameTime: null,
				executionTime: Date.now() - startTime,
				fromCache: true,
				message: 'Leaderboard is up to date (from cache)'
			};
		}

		// Try to acquire lock for this organization/season
		const lockId = randomUUID();
		const lockAcquired = await LeaderboardLock.acquire(organizationId, season);

		if (!lockAcquired) {
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
				message: 'Another recalculation is already in progress'
			};
		}

		try {
			// Mark as calculating
			await db
				.update(leaderboardMeta)
				.set({
					lastLeaderboardUpdate: new Date()
				})
				.where(
					and(
						eq(leaderboardMeta.organizationId, organizationId),
						eq(leaderboardMeta.season, season)
					)
				);

			// Get all fixtures for this season (fixtures are global, not organization-specific)
			const allFixtures = await db
				.select()
				.from(fixtures)
				.where(eq(fixtures.season, season))
				.orderBy(desc(fixtures.weekId), desc(fixtures.matchDate));

			const totalMatches = allFixtures.length;
			const finishedMatches = allFixtures.filter(
				(f) => f.homeScore !== null && f.awayScore !== null
			).length;

			// Get the latest finished game time
			const latestFinishedGame = allFixtures.find(
				(f) => f.homeScore !== null && f.awayScore !== null
			);
			const lastGameTime = latestFinishedGame?.matchDate || null;

			// Get all users with predictions for this organization
			const usersWithPredictions = await db
				.selectDistinct({ userId: predictions.userId })
				.from(predictions)
				.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
				.where(and(eq(predictions.organizationId, organizationId), eq(fixtures.season, season)));

			const userStats = new Map<string, LeaderboardEntry>();

			// Initialize user stats
			for (const { userId } of usersWithPredictions) {
				userStats.set(userId, {
					userId: userId,
					userName: '',
					userEmail: '',
					totalPoints: 0,
					correctScorelines: 0,
					correctOutcomes: 0,
					predictedFixtures: 0,
					completedFixtures: 0,
					lastUpdated: new Date().toISOString()
				});
			}

			// Calculate stats for each user
			for (const { userId } of usersWithPredictions) {
				const userPredictions = await db
					.select({
						prediction: predictions,
						fixture: fixtures
					})
					.from(predictions)
					.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
					.where(
						and(
							eq(predictions.userId, userId),
							eq(predictions.organizationId, organizationId),
							eq(fixtures.season, season)
						)
					);

				let totalPoints = 0;
				let correctScorelines = 0;
				let correctOutcomes = 0;
				let predictedFixtures = 0;
				let completedFixtures = 0;

				for (const { prediction, fixture } of userPredictions) {
					predictedFixtures++;

					// Only count points for finished fixtures
					if (fixture.homeScore !== null && fixture.awayScore !== null) {
						completedFixtures++;

						// Get the multiplier (default to 1 if not set)
						const multiplier = fixture.pointsMultiplier || 1;

						// Perfect score (3 points * multiplier)
						if (
							prediction.predictedHomeScore === fixture.homeScore &&
							prediction.predictedAwayScore === fixture.awayScore
						) {
							correctScorelines++;
							totalPoints += 3 * multiplier;
						}
						// Correct outcome (1 point * multiplier)
						else if (
							(prediction.predictedHomeScore > prediction.predictedAwayScore &&
								fixture.homeScore > fixture.awayScore) ||
							(prediction.predictedHomeScore < prediction.predictedAwayScore &&
								fixture.homeScore < fixture.awayScore) ||
							(prediction.predictedHomeScore === prediction.predictedAwayScore &&
								fixture.homeScore === fixture.awayScore)
						) {
							correctOutcomes++;
							totalPoints += 1 * multiplier;
						}
					}
				}

				userStats.set(userId, {
					userId: userId,
					userName: '',
					userEmail: '',
					totalPoints,
					correctScorelines,
					correctOutcomes,
					predictedFixtures,
					completedFixtures,
					lastUpdated: new Date().toISOString()
				});
			}

			// Get user names
			const userIds = Array.from(userStats.keys());
			if (userIds.length > 0) {
				const users = await db
					.select({
						id: authUser.id,
						name: authUser.name,
						email: authUser.email
					})
					.from(authUser)
					.where(inArray(authUser.id, userIds));

				for (const user of users) {
					const stats = userStats.get(user.id);
					if (stats) {
						stats.userName = user.name || '';
						stats.userEmail = user.email || '';
					}
				}
			}

			// Convert to array and sort
			const leaderboardData = Array.from(userStats.values()).sort((a, b) => {
				// Primary sort: total points (descending)
				if (a.totalPoints !== b.totalPoints) {
					return b.totalPoints - a.totalPoints;
				}

				// Tiebreaker 1: correct scorelines (descending)
				if (a.correctScorelines !== b.correctScorelines) {
					return b.correctScorelines - a.correctScorelines;
				}

				// Tiebreaker 2: correct outcomes (descending)
				if (a.correctOutcomes !== b.correctOutcomes) {
					return b.correctOutcomes - a.correctOutcomes;
				}

				// Final tiebreaker: alphabetical by name
				return (a.userName || '').localeCompare(b.userName || '');
			});

			// Cache the results
			await LeaderboardCache.set(organizationId, season, leaderboardData);

			// Update metadata
			await db
				.update(leaderboardMeta)
				.set({
					lastLeaderboardUpdate: new Date(),
					totalMatches,
					finishedMatches,
					lastGameTime
				})
				.where(
					and(
						eq(leaderboardMeta.organizationId, organizationId),
						eq(leaderboardMeta.season, season)
					)
				);

			const executionTime = Date.now() - startTime;

			return {
				success: true,
				organizationId,
				season,
				usersUpdated: leaderboardData.length,
				totalMatches,
				finishedMatches,
				lastGameTime,
				executionTime,
				fromCache: false,
				message: `Leaderboard recalculated successfully for ${leaderboardData.length} users in ${executionTime}ms`
			};
		} finally {
			// Always release the lock
			await LeaderboardLock.release(organizationId, season);
		}
	} catch (error) {
		console.error('Error recalculating leaderboard:', error);

		// Mark as not calculating if there was an error
		try {
			await db
				.update(leaderboardMeta)
				.set({
					lastLeaderboardUpdate: new Date()
				})
				.where(
					and(
						eq(leaderboardMeta.organizationId, organizationId),
						eq(leaderboardMeta.season, season)
					)
				);
		} catch (updateError) {
			console.error('Error updating metadata after failure:', updateError);
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
 * Recalculate leaderboards for all organizations
 * Useful for batch operations and maintenance
 */
export async function recalculateAllLeaderboards(
	season: string = '2025-26',
	forceRecalculation: boolean = false
): Promise<RecalculationResult[]> {
	// Get all organizations that have predictions
	const organizations = await db
		.selectDistinct({ organizationId: predictions.organizationId })
		.from(predictions);

	const results: RecalculationResult[] = [];

	// Process each organization
	for (const org of organizations) {
		const result = await recalculateLeaderboard(org.organizationId, season, forceRecalculation);
		results.push(result);
	}

	return results;
}

/**
 * Get leaderboard data with cache fallback
 * First tries cache, then triggers recalculation if needed
 */
export async function getLeaderboard(
	organizationId: string,
	season: string = '2025-26'
): Promise<LeaderboardEntry[]> {
	// Try to get from cache first
	const cached = await LeaderboardCache.get(organizationId, season);

	if (cached && cached.data.length > 0) {
		return cached.data;
	}

	// If no cache, trigger recalculation
	const result = await recalculateLeaderboard(organizationId, season, true);

	if (result.success) {
		const fresh = await LeaderboardCache.get(organizationId, season);
		return fresh?.data || [];
	}

	// Fallback to direct database query
	return await getLeaderboardFromDatabase(organizationId, season);
}

/**
 * Direct database query for leaderboard (fallback)
 */
async function getLeaderboardFromDatabase(
	organizationId: string,
	season: string
): Promise<LeaderboardEntry[]> {
	const leaderboardData = await db
		.select({
			userId: leagueTable.userId,
			userName: authUser.name,
			userEmail: authUser.email,
			totalPoints: leagueTable.totalPoints,
			correctScorelines: leagueTable.correctScorelines,
			correctOutcomes: leagueTable.correctOutcomes,
			predictedFixtures: leagueTable.predictedFixtures,
			completedFixtures: leagueTable.completedFixtures,
			lastUpdated: leagueTable.lastUpdated
		})
		.from(leagueTable)
		.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
		.where(and(eq(leagueTable.organizationId, organizationId), eq(leagueTable.season, season)))
		.orderBy(desc(leagueTable.totalPoints));

	return leaderboardData.map((row, index) => ({
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
}
