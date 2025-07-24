import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { fixtures, predictions } from '../../../drizzle/schema';
import { inArray } from 'drizzle-orm';

// Load environment variables from .env file
dotenv.config();

// Set up database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function drop2025Fixtures() {
	console.log('🗑️  Dropping all 2025 fixtures...');

	try {
		// First get all fixture IDs to delete their predictions too
		const allFixtures = await db.select({ id: fixtures.id }).from(fixtures);
		const fixtureIds = allFixtures.map((f) => f.id);

		if (fixtureIds.length > 0) {
			console.log(`📊 Found ${fixtureIds.length} fixtures to delete`);

			// Delete predictions first (foreign key constraint)
			console.log('🗑️  Deleting predictions...');
			await db.delete(predictions).where(inArray(predictions.fixtureId, fixtureIds));

			// Delete fixtures
			console.log('🗑️  Deleting fixtures...');
			await db.delete(fixtures);

			console.log('✅ All 2025 fixtures and predictions deleted successfully!');
		} else {
			console.log('📊 No fixtures found to delete');
		}
	} catch (error) {
		console.error('❌ Error dropping fixtures:', error);
		process.exit(1);
	}
}

drop2025Fixtures().catch(console.error);
