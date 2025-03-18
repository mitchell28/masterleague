import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { fixtures } from '../lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Load environment variables from .env file
dotenv.config();

// Set up database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

/**
 * Update fixture statuses to use the new format
 */
async function updateFixtureStatuses(): Promise<void> {
	try {
		console.log('Starting fixture status update...');

		// Get all fixtures in the database
		const allFixtures = await db.select().from(fixtures);
		console.log(`Found ${allFixtures.length} fixtures to update`);

		// Status mapping from old to new
		const statusMapping: Record<string, string> = {
			upcoming: 'TIMED',
			live: 'IN_PLAY',
			completed: 'FINISHED'
		};

		let updateCount = 0;

		// Update each fixture based on its current status
		for (const fixture of allFixtures) {
			const currentStatus = fixture.status;
			// Check if this is an old status that needs to be updated
			if (Object.keys(statusMapping).includes(currentStatus)) {
				const newStatus = statusMapping[currentStatus];

				// Update the fixture with the new status
				await db
					.update(fixtures)
					.set({
						status: newStatus,
						lastUpdated: new Date()
					})
					.where(eq(fixtures.id, fixture.id));

				updateCount++;
			}
		}

		console.log(`Successfully updated ${updateCount} fixtures with new status codes`);
	} catch (error) {
		console.error('Error updating fixture statuses:', error);
	}
}

// Execute the function
updateFixtureStatuses()
	.then(() => {
		console.log('Fixture status update complete');
		process.exit(0);
	})
	.catch((error) => {
		console.error('Failed to update fixture statuses:', error);
		process.exit(1);
	});
