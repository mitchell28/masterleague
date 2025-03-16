import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Migration script to add predictedFixtures and completedFixtures columns
 * to the league_table if they don't exist.
 */
async function fixLeagueTable() {
	console.log('Starting fix to add missing columns to league table...');

	try {
		// Add the new columns if they don't exist
		console.log('Adding columns if they do not exist...');
		await db.execute(sql`
      ALTER TABLE league_table 
      ADD COLUMN IF NOT EXISTS predicted_fixtures INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS completed_fixtures INTEGER DEFAULT 0;
    `);

		console.log('Successfully added missing columns to league_table');
	} catch (error) {
		console.error('Error during fix:', error);
		throw error;
	}
}

// Run the fix
fixLeagueTable()
	.then(() => {
		console.log('Fix completed successfully');
		process.exit(0);
	})
	.catch((error) => {
		console.error('Fix failed:', error);
		process.exit(1);
	});
