import { db } from '$lib/server/db/index';
import { fixtures, predictions } from '$lib/server/db/schema';
import { eq, and, isNotNull, isNull, or, gte } from 'drizzle-orm';
import { calculatePredictionPoints } from '$lib/server/engine/shared/utils';

/**
 * Safety check to find and fix predictions that weren't processed
 * This should be called periodically to catch any missed fixtures
 */
export async function fixUnprocessedPredictions(
	daysBack: number = 7,
	season: string = '2025-26'
): Promise<{
	success: boolean;
	fixturesChecked: number;
	predictionsFixed: number;
	pointsAwarded: number;
	errors: string[];
}> {
	const errors: string[] = [];
	let fixturesChecked = 0;
	let predictionsFixed = 0;
	let pointsAwarded = 0;

	try {
		console.log(`🔍 Checking for unprocessed predictions from the last ${daysBack} days...`);

		// Look for finished fixtures from the last X days
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysBack);

		// Find finished fixtures that have predictions with null points
		const problematicFixtures = await db
			.selectDistinct({
				id: fixtures.id,
				homeScore: fixtures.homeScore,
				awayScore: fixtures.awayScore,
				pointsMultiplier: fixtures.pointsMultiplier,
				matchDate: fixtures.matchDate,
				status: fixtures.status
			})
			.from(fixtures)
			.innerJoin(predictions, eq(predictions.fixtureId, fixtures.id))
			.where(
				and(
					eq(fixtures.season, season),
					eq(fixtures.status, 'FINISHED'),
					isNotNull(fixtures.homeScore),
					isNotNull(fixtures.awayScore),
					gte(fixtures.matchDate, cutoffDate),
					or(
						isNull(predictions.points),
						// Also check for predictions that might have been incorrectly set to 0
						// when they should have gotten 1 point for correct outcome
						eq(predictions.points, 0)
					)
				)
			);

		console.log(
			`📊 Found ${problematicFixtures.length} fixtures that may have unprocessed predictions`
		);

		for (const fixture of problematicFixtures) {
			fixturesChecked++;

			console.log(`🔧 Checking fixture ${fixture.id}: ${fixture.homeScore}-${fixture.awayScore}`);

			// Get all predictions for this fixture
			const fixturePredictions = await db
				.select()
				.from(predictions)
				.where(eq(predictions.fixtureId, fixture.id));

			for (const prediction of fixturePredictions) {
				// Calculate what the points should be
				const correctPoints = calculatePredictionPoints(
					prediction.predictedHomeScore,
					prediction.predictedAwayScore,
					fixture.homeScore,
					fixture.awayScore,
					fixture.pointsMultiplier || 1
				);

				// Check if the prediction needs updating
				if (prediction.points !== correctPoints) {
					console.log(
						`🔄 Fixing prediction ${prediction.id}: ${prediction.points} → ${correctPoints} points`
					);

					try {
						await db
							.update(predictions)
							.set({ points: correctPoints })
							.where(eq(predictions.id, prediction.id));

						predictionsFixed++;
						pointsAwarded += correctPoints - (prediction.points || 0);
					} catch (error) {
						const errorMsg = `Failed to update prediction ${prediction.id}: ${error}`;
						console.error(errorMsg);
						errors.push(errorMsg);
					}
				}
			}
		}

		console.log(
			`✅ Safety check complete: ${predictionsFixed} predictions fixed, ${pointsAwarded} points awarded`
		);

		return {
			success: true,
			fixturesChecked,
			predictionsFixed,
			pointsAwarded,
			errors
		};
	} catch (error) {
		const errorMsg = `Safety check failed: ${error}`;
		console.error(errorMsg);
		errors.push(errorMsg);

		return {
			success: false,
			fixturesChecked,
			predictionsFixed,
			pointsAwarded,
			errors
		};
	}
}

/**
 * Emergency fix for a specific fixture
 */
export async function fixSpecificFixture(fixtureId: string): Promise<{
	success: boolean;
	predictionsFixed: number;
	pointsAwarded: number;
	error?: string;
}> {
	try {
		console.log(`🚨 Emergency fix for fixture ${fixtureId}`);

		// Get the fixture details
		const fixture = await db
			.select()
			.from(fixtures)
			.where(eq(fixtures.id, fixtureId))
			.then((r) => r[0]);

		if (!fixture) {
			return { success: false, predictionsFixed: 0, pointsAwarded: 0, error: 'Fixture not found' };
		}

		if (fixture.status !== 'FINISHED' || fixture.homeScore === null || fixture.awayScore === null) {
			return {
				success: false,
				predictionsFixed: 0,
				pointsAwarded: 0,
				error: 'Fixture not finished or missing scores'
			};
		}

		// Get all predictions for this fixture
		const fixturePredictions = await db
			.select()
			.from(predictions)
			.where(eq(predictions.fixtureId, fixtureId));

		let predictionsFixed = 0;
		let pointsAwarded = 0;

		for (const prediction of fixturePredictions) {
			const correctPoints = calculatePredictionPoints(
				prediction.predictedHomeScore,
				prediction.predictedAwayScore,
				fixture.homeScore,
				fixture.awayScore,
				fixture.pointsMultiplier || 1
			);

			if (prediction.points !== correctPoints) {
				await db
					.update(predictions)
					.set({ points: correctPoints })
					.where(eq(predictions.id, prediction.id));

				predictionsFixed++;
				pointsAwarded += correctPoints - (prediction.points || 0);
			}
		}

		console.log(`✅ Emergency fix complete: ${predictionsFixed} predictions fixed`);

		return {
			success: true,
			predictionsFixed,
			pointsAwarded
		};
	} catch (error) {
		console.error(`Emergency fix failed:`, error);
		return {
			success: false,
			predictionsFixed: 0,
			pointsAwarded: 0,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}
