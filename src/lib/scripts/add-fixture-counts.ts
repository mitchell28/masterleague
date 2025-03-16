import { db } from '../server/db';
import { predictions, fixtures, leagueTable } from '../server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

/**
 * Migration script to add and populate predictedFixtures and completedFixtures columns
 * to the league_table.
 */
async function addFixtureCounts() {
	console.log('Starting migration to add fixture counts to league table...');

	try {
		// First, add the new columns if they don't exist
		console.log('Adding columns if they do not exist...');
		await db.execute(sql`
      ALTER TABLE league_table 
      ADD COLUMN IF NOT EXISTS predicted_fixtures INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS completed_fixtures INTEGER DEFAULT 0;
    `);

		// Get all users from the league table
		const leagueEntries = await db.select().from(leagueTable);
		console.log(`Found ${leagueEntries.length} users in league table`);

		// Update each user's fixture counts
		for (const entry of leagueEntries) {
			console.log(`Processing user: ${entry.userId}`);

			// Get all predictions for this user
			const userPredictions = await db
				.select()
				.from(predictions)
				.where(eq(predictions.userId, entry.userId));

			console.log(`User has ${userPredictions.length} predictions`);

			// Get all fixture IDs that this user has predicted
			const fixtureIds = userPredictions.map((p) => p.fixtureId);

			if (fixtureIds.length > 0) {
				// Count completed fixtures that this user predicted
				const completedFixtures = await db
					.select()
					.from(fixtures)
					.where(and(inArray(fixtures.id, fixtureIds), eq(fixtures.status, 'completed')));

				console.log(`User has ${completedFixtures.length} completed fixtures`);

				// Update the league table with the counts
				await db
					.update(leagueTable)
					.set({
						predictedFixtures: userPredictions.length,
						completedFixtures: completedFixtures.length
					})
					.where(eq(leagueTable.id, entry.id));

				console.log(
					`Updated user ${entry.userId} with predicted: ${userPredictions.length}, completed: ${completedFixtures.length}`
				);
			}
		}

		console.log('Migration completed successfully');
	} catch (error) {
		console.error('Error during migration:', error);
		throw error;
	}
}

// Run the migration
addFixtureCounts()
	.then(() => {
		console.log('Migration completed successfully');
		process.exit(0);
	})
	.catch((error) => {
		console.error('Migration failed:', error);
		process.exit(1);
	});
