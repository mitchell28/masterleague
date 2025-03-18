import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import { fixtures, predictions, leagueTable } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// Load environment variables from .env file
dotenv.config();

// Set up database connection directly instead of using the shared db connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	console.error('DATABASE_URL is not set in environment variables');
	process.exit(1);
}

// Create a new database connection
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

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
 * Main function to recalculate all points
 */
async function recalculateAllPoints() {
	console.log('🔄 Starting points recalculation...');

	try {
		// Get all completed fixtures
		const completedFixtures = await db
			.select()
			.from(fixtures)
			.where(eq(fixtures.status, 'FINISHED'));

		console.log(`Found ${completedFixtures.length} completed fixtures to process`);

		// Process each fixture
		for (const fixture of completedFixtures) {
			if (fixture.homeScore === null || fixture.awayScore === null) {
				console.log(`Skipping fixture ${fixture.id} - scores not available`);
				continue;
			}

			console.log(
				`Processing fixture ${fixture.id}: ${fixture.homeScore}-${fixture.awayScore} (${fixture.pointsMultiplier}x)`
			);

			// Get all predictions for this fixture
			const fixturePredictions = await db
				.select()
				.from(predictions)
				.where(eq(predictions.fixtureId, fixture.id));

			console.log(`Found ${fixturePredictions.length} predictions for fixture ${fixture.id}`);

			// Track user stats for batch update
			const userStats: Record<
				string,
				{
					totalPoints: number;
					correctScorelines: number;
					correctOutcomes: number;
					processedPredictions: number;
				}
			> = {};

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
			}

			console.log(`Updated ${fixturePredictions.length} predictions for fixture ${fixture.id}`);
		}

		// Now rebuild all league table entries from scratch
		console.log('Rebuilding league table...');

		// Get all users with predictions
		const userIds = await db.selectDistinct({ userId: predictions.userId }).from(predictions);

		// Process each user
		for (const { userId } of userIds) {
			// Get all predictions for this user
			const userPredictions = await db
				.select({
					id: predictions.id,
					points: predictions.points,
					fixtureId: predictions.fixtureId,
					predictedHomeScore: predictions.predictedHomeScore,
					predictedAwayScore: predictions.predictedAwayScore
				})
				.from(predictions)
				.where(eq(predictions.userId, userId));

			// Get all fixtures for these predictions
			const fixtureIds = userPredictions.map((p) => p.fixtureId);
			const userFixtures = await db
				.select()
				.from(fixtures)
				.where(
					and(
						eq(fixtures.status, 'FINISHED'),
						inArray(fixtures.id, fixtureIds) // Only get relevant fixtures
					)
				);

			// Calculate user stats
			let totalPoints = 0;
			let correctScorelines = 0;
			let correctOutcomes = 0;
			let completedFixtures = 0;

			for (const prediction of userPredictions) {
				// Skip predictions without points
				if (prediction.points === null || prediction.points === 0) continue;

				totalPoints += prediction.points;

				// Find matching fixture
				const fixture = userFixtures.find((f) => f.id === prediction.fixtureId);
				if (fixture && fixture.homeScore !== null && fixture.awayScore !== null) {
					completedFixtures++;

					if (
						prediction.predictedHomeScore === fixture.homeScore &&
						prediction.predictedAwayScore === fixture.awayScore
					) {
						correctScorelines++;
					} else {
						correctOutcomes++;
					}
				}
			}

			// Get all predictions count
			const predictedFixtures = userPredictions.length;

			// Check if user already has a league table entry
			const existingEntry = await db
				.select()
				.from(leagueTable)
				.where(eq(leagueTable.userId, userId))
				.then((rows) => rows[0]);

			if (existingEntry) {
				// Update existing entry
				await db
					.update(leagueTable)
					.set({
						totalPoints,
						correctScorelines,
						correctOutcomes,
						predictedFixtures,
						completedFixtures,
						lastUpdated: new Date()
					})
					.where(eq(leagueTable.id, existingEntry.id));
			} else {
				// Create new entry
				await db.insert(leagueTable).values({
					id: randomUUID(),
					userId,
					totalPoints,
					correctScorelines,
					correctOutcomes,
					predictedFixtures,
					completedFixtures,
					lastUpdated: new Date()
				});
			}

			console.log(
				`Updated league table for user ${userId}: ${totalPoints} points, ${correctScorelines} perfects, ${correctOutcomes} outcomes`
			);
		}

		console.log('✅ Points recalculation completed successfully!');
		// Close the database connection
		await sql.end();
	} catch (error) {
		console.error('❌ Error recalculating points:', error);
		await sql.end();
		process.exit(1);
	}
}

// Run the script
recalculateAllPoints().catch(console.error);
