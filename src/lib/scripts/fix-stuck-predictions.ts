/**
 * This script fixes stuck predictions that show as "processing"
 * by setting points to 0 for any finished fixtures with null points
 */

import { db } from '../server/db';
import { predictions, fixtures } from '../server/db/schema';
import { and, eq, inArray, sql, isNull } from 'drizzle-orm';

async function fixStuckPredictions() {
	console.log('Starting to fix stuck predictions...');

	try {
		// Step 1: Get all finished fixtures
		const finishedFixtures = await db
			.select({
				id: fixtures.id,
				homeScore: fixtures.homeScore,
				awayScore: fixtures.awayScore
			})
			.from(fixtures)
			.where(
				and(
					eq(fixtures.status, 'FINISHED'),
					sql`${fixtures.homeScore} IS NOT NULL`,
					sql`${fixtures.awayScore} IS NOT NULL`
				)
			);

		console.log(`Found ${finishedFixtures.length} finished fixtures with scores`);

		if (finishedFixtures.length === 0) {
			console.log('No finished fixtures found. Exiting.');
			return;
		}

		const fixtureIds = finishedFixtures.map((fixture) => fixture.id);

		// Step 2: Find predictions for these fixtures that have null points
		const stuckPredictions = await db
			.select({
				id: predictions.id,
				fixtureId: predictions.fixtureId,
				userId: predictions.userId
			})
			.from(predictions)
			.where(and(inArray(predictions.fixtureId, fixtureIds), isNull(predictions.points)));

		console.log(`Found ${stuckPredictions.length} stuck predictions with null points`);

		if (stuckPredictions.length === 0) {
			console.log('No stuck predictions found. All predictions seem to be properly processed.');
			return;
		}

		// Step 3: Update these predictions with 0 points
		const result = await db
			.update(predictions)
			.set({ points: 0 })
			.where(
				and(
					inArray(
						predictions.id,
						stuckPredictions.map((p) => p.id)
					)
				)
			)
			.execute();

		console.log(`Successfully updated ${result} predictions to have 0 points instead of null`);
		console.log('Finished fixing stuck predictions!');
	} catch (error) {
		console.error('Error fixing stuck predictions:', error);
	}
}

// Run the script if executed directly
if (process.argv[1] === import.meta.url) {
	fixStuckPredictions()
		.then(() => {
			console.log('Script execution complete');
			process.exit(0);
		})
		.catch((err) => {
			console.error('Script failed:', err);
			process.exit(1);
		});
}

export { fixStuckPredictions };
