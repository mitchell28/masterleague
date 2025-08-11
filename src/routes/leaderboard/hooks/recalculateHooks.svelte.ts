import { db } from '$lib/server/db';
import { fixtures, predictions, leagueTable } from '$lib/server/db/schema';
import { eq, and, inArray, desc, gte } from 'drizzle-orm';
import type { Fixture, Prediction } from '$lib/server/db/schema';
import { randomUUID } from 'crypto';

/**
 * Interface for recalculation result
 */
export interface RecalculationResult {
	processedFixtures: number;
	processedPredictions: number;
	updatedUsers: number;
}

/**
 * Svelte 5 hook for managing points recalculation
 * This hook provides reactive functionality for processing fixture points
 */
export function useRecalculation(organizationId?: string, season: string = '2025-26') {
	/**
	 * Process recent fixtures that need point calculation
	 * Returns a promise with the recalculation results
	 */
	async function processRecentFixtures(): Promise<RecalculationResult> {
		return await processRecentFixturesImpl();
	}

	/**
	 * Process specific fixtures by their IDs
	 */
	async function processFixtures(fixtureIds: string[]): Promise<RecalculationResult> {
		return await processFixturePoints(fixtureIds, organizationId, season);
	}

	/**
	 * Recalculate all points for all fixtures
	 */
	async function recalculateAll(): Promise<RecalculationResult> {
		return await recalculateAllPoints();
	}

	/**
	 * Update league table for specific users
	 */
	async function updateUsersLeagueTable(userIds: string[]): Promise<number> {
		return await updateLeagueTableForUsers(userIds, organizationId, season);
	}

	return {
		processRecentFixtures,
		processFixtures,
		recalculateAll,
		updateUsersLeagueTable
	};
}

/**
 * User stats tracking for batch updates
 */
interface UserStats {
	totalPoints: number;
	correctScorelines: number;
	correctOutcomes: number;
	processedPredictions: number;
}

/**
 * Calculates points for a prediction
 */
function calculatePredictionPoints(
	predictedHomeScore: number,
	predictedAwayScore: number,
	actualHomeScore: number,
	actualAwayScore: number,
	pointsMultiplier = 1
): number {
	// Perfect score: 3 points × multiplier
	if (predictedHomeScore === actualHomeScore && predictedAwayScore === actualAwayScore) {
		return 3 * pointsMultiplier;
	}

	// Correct outcome: 1 point × multiplier
	const predictedOutcome =
		predictedHomeScore > predictedAwayScore
			? 'home'
			: predictedHomeScore < predictedAwayScore
				? 'away'
				: 'draw';

	const actualOutcome =
		actualHomeScore > actualAwayScore
			? 'home'
			: actualHomeScore < actualAwayScore
				? 'away'
				: 'draw';

	if (predictedOutcome === actualOutcome) {
		return 1 * pointsMultiplier;
	}

	// Incorrect: 0 points
	return 0;
}

/**
 * Process points for specific fixtures
 * This function is optimized for processing a targeted set of fixtures
 */
async function processFixturePoints(
	fixtureIds: string[],
	organizationId?: string,
	season: string = '2025-26'
): Promise<RecalculationResult> {
	console.log(`Processing points for ${fixtureIds.length} fixtures`);
	let processedFixtures = 0;
	let processedPredictions = 0;
	let updatedUsers = 0;

	try {
		// Get only the specified fixtures that are completed
		const targetFixtures: Fixture[] = await db
			.select()
			.from(fixtures)
			.where(and(eq(fixtures.status, 'FINISHED'), inArray(fixtures.id, fixtureIds)));

		if (targetFixtures.length === 0) {
			console.log('No completed fixtures found to process');
			return { processedFixtures: 0, processedPredictions: 0, updatedUsers: 0 };
		}

		// Track user stats for batch update
		const userStats: Record<string, UserStats> = {};

		// Process each fixture
		for (const fixture of targetFixtures) {
			if (fixture.homeScore === null || fixture.awayScore === null) {
				console.log(`Skipping fixture ${fixture.id} - scores not available`);
				continue;
			}

			// Get all predictions for this fixture
			const fixturePredictions: Prediction[] = await db
				.select()
				.from(predictions)
				.where(eq(predictions.fixtureId, fixture.id));

			// Process each prediction
			for (const prediction of fixturePredictions) {
				// Calculate points with multiplier
				const points = calculatePredictionPoints(
					prediction.predictedHomeScore,
					prediction.predictedAwayScore,
					fixture.homeScore,
					fixture.awayScore,
					fixture.pointsMultiplier
				);

				// Update the prediction
				await db.update(predictions).set({ points }).where(eq(predictions.id, prediction.id));

				// Track user stats
				if (!userStats[prediction.userId]) {
					userStats[prediction.userId] = {
						totalPoints: 0,
						correctScorelines: 0,
						correctOutcomes: 0,
						processedPredictions: 0
					};
				}

				userStats[prediction.userId].totalPoints += points;
				userStats[prediction.userId].processedPredictions++;

				// Track correctness type
				if (points === 0) {
					// Incorrect - no update needed
				} else if (
					prediction.predictedHomeScore === fixture.homeScore &&
					prediction.predictedAwayScore === fixture.awayScore
				) {
					userStats[prediction.userId].correctScorelines++;
				} else {
					userStats[prediction.userId].correctOutcomes++;
				}

				processedPredictions++;
			}

			// Mark the fixture as processed by updating lastUpdated timestamp
			await db.update(fixtures).set({ lastUpdated: new Date() }).where(eq(fixtures.id, fixture.id));

			processedFixtures++;
		}

		// Update league table for affected users
		await updateLeagueTableForUsers(Object.keys(userStats), organizationId, season);
		updatedUsers = Object.keys(userStats).length;

		console.log(
			`✅ Processed ${processedFixtures} fixtures and ${processedPredictions} predictions`
		);
		return { processedFixtures, processedPredictions, updatedUsers };
	} catch (error) {
		console.error('❌ Error processing points:', error);
		throw error;
	}
}

/**
 * Update league table entries for specific users
 * This function recalculates the full stats for each user
 */
async function updateLeagueTableForUsers(
	userIds: string[],
	organizationId?: string,
	season: string = '2025-26'
): Promise<number> {
	let updatedUsers = 0;

	for (const userId of userIds) {
		try {
			// Get all points from user's predictions
			const allUserPredictions = await db
				.select()
				.from(predictions)
				.where(eq(predictions.userId, userId));

			// Get completed fixtures for this user
			const fixtureIds = allUserPredictions.map((p) => p.fixtureId);
			const userCompletedFixtures = await db
				.select()
				.from(fixtures)
				.where(and(eq(fixtures.status, 'FINISHED'), inArray(fixtures.id, fixtureIds)));

			// Calculate stats
			const totalPoints = allUserPredictions.reduce((sum, p) => sum + (p.points || 0), 0);
			const correctScorelines = allUserPredictions.filter((p) => p.points === 3).length;
			const correctOutcomes = allUserPredictions.filter((p) => p.points === 1).length;

			// Check if user already has a league table entry for this organization and season
			const existingEntry = await db
				.select()
				.from(leagueTable)
				.where(
					organizationId
						? and(
								eq(leagueTable.userId, userId),
								eq(leagueTable.organizationId, organizationId),
								eq(leagueTable.season, season)
							)
						: eq(leagueTable.userId, userId)
				)
				.then((rows) => rows[0]);

			if (existingEntry) {
				// Update existing entry
				await db
					.update(leagueTable)
					.set({
						totalPoints,
						correctScorelines,
						correctOutcomes,
						predictedFixtures: allUserPredictions.length,
						completedFixtures: userCompletedFixtures.length,
						lastUpdated: new Date()
					})
					.where(eq(leagueTable.id, existingEntry.id));
			} else {
				// Create new entry - only if organizationId is provided
				if (organizationId) {
					await db.insert(leagueTable).values({
						id: randomUUID(),
						userId,
						organizationId,
						season,
						totalPoints,
						correctScorelines,
						correctOutcomes,
						predictedFixtures: allUserPredictions.length,
						completedFixtures: userCompletedFixtures.length,
						lastUpdated: new Date()
					});
				}
			}

			updatedUsers++;
		} catch (error) {
			console.error(`Error updating league table for user ${userId}:`, error);
		}
	}

	return updatedUsers;
}

/**
 * API-friendly version of recalculate points
 * that works with the shared database connection
 */
export async function recalculateAllPoints(): Promise<RecalculationResult> {
	console.log('🔄 Starting points recalculation...');
	let processedFixtures = 0;
	let processedPredictions = 0;
	let updatedUsers = 0;

	try {
		// Get all completed fixtures
		const completedFixtures: Fixture[] = await db
			.select()
			.from(fixtures)
			.where(eq(fixtures.status, 'FINISHED'));

		console.log(`Found ${completedFixtures.length} completed fixtures to process`);

		// Process in batches to avoid memory issues
		const BATCH_SIZE = 20;
		const fixtureIds = completedFixtures.map((f) => f.id);

		// Split into batches
		for (let i = 0; i < fixtureIds.length; i += BATCH_SIZE) {
			const batchFixtureIds = fixtureIds.slice(i, i + BATCH_SIZE);
			console.log(
				`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(fixtureIds.length / BATCH_SIZE)}`
			);

			// Process this batch
			const result = await processFixturePoints(batchFixtureIds);
			processedFixtures += result.processedFixtures;
			processedPredictions += result.processedPredictions;
			updatedUsers += result.updatedUsers;
		}

		console.log('✅ Points recalculation completed successfully!');
		return { processedFixtures, processedPredictions, updatedUsers };
	} catch (error) {
		console.error('❌ Error recalculating points:', error);
		throw error;
	}
}

/**
 * Process recent fixtures that need point calculation
 * This is designed to be called frequently without performance impact
 */
async function processRecentFixturesImpl(): Promise<RecalculationResult> {
	console.log('🔍 Looking for recent fixtures to process...');

	try {
		// Find all fixtures that are finished but don't have points calculated
		const finishedFixtures = await db
			.select()
			.from(fixtures)
			.where(eq(fixtures.status, 'FINISHED'));

		if (finishedFixtures.length === 0) {
			console.log('No finished fixtures found to process');
			return { processedFixtures: 0, processedPredictions: 0, updatedUsers: 0 };
		}

		// Get all predictions to check which fixtures need processing
		const allPredictions = await db
			.select()
			.from(predictions)
			.where(
				inArray(
					predictions.fixtureId,
					finishedFixtures.map((f) => f.id)
				)
			);

		// Find fixtures that have predictions with null points
		const nullPointPredictions = allPredictions.filter((p) => p.points === null);
		const fixtureIdsNeedingProcessing = [...new Set(nullPointPredictions.map((p) => p.fixtureId))];

		// Also include fixtures that don't have lastUpdated timestamp
		const fixturesWithoutLastUpdated = finishedFixtures
			.filter((f) => !f.lastUpdated && !fixtureIdsNeedingProcessing.includes(f.id))
			.map((f) => f.id);

		const fixtureIds = [...fixtureIdsNeedingProcessing, ...fixturesWithoutLastUpdated];

		if (fixtureIds.length === 0) {
			console.log('All finished fixtures have already been processed');
			return { processedFixtures: 0, processedPredictions: 0, updatedUsers: 0 };
		}

		console.log(`Found ${fixtureIds.length} fixtures that need points calculation`);

		// Process these fixtures in batches to avoid memory issues
		const BATCH_SIZE = 20;
		let totalProcessed = { processedFixtures: 0, processedPredictions: 0, updatedUsers: 0 };

		// Split into batches
		for (let i = 0; i < fixtureIds.length; i += BATCH_SIZE) {
			const batchFixtureIds = fixtureIds.slice(i, i + BATCH_SIZE);
			console.log(
				`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(fixtureIds.length / BATCH_SIZE)}`
			);

			// Process this batch
			const result = await processFixturePoints(batchFixtureIds);
			totalProcessed.processedFixtures += result.processedFixtures;
			totalProcessed.processedPredictions += result.processedPredictions;
			totalProcessed.updatedUsers += result.updatedUsers;
		}

		return totalProcessed;
	} catch (error) {
		console.error('❌ Error processing recent fixtures:', error);
		return { processedFixtures: 0, processedPredictions: 0, updatedUsers: 0 };
	}
}

// Export standalone functions for backward compatibility
export { processRecentFixturesImpl as processRecentFixtures };
