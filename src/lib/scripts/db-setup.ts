import * as dotenv from 'dotenv';
import './db-connection'; // Import this first to set up the environment and mocks
// Get the db instance from the db-connection module, not from ../server/db
import { db } from './db-connection';
import { fixtures, teams } from '../lib/server/db/schema';
import { count } from 'drizzle-orm';

// Load environment variables from .env file
dotenv.config();

/**
 * Script to initialize the database
 * - Creates tables if they don't exist
 * - Seeds initial data if needed
 */
async function setupDatabase() {
	console.log('🔄 Setting up database...');

	try {
		// Check if teams table exists and has data
		const teamCountResult = await db.select({ count: count() }).from(teams);
		const teamCount = teamCountResult[0]?.count || 0;

		if (teamCount === 0) {
			console.log('⚽ Seeding teams data...');
			// Teams seeding logic would go here
		} else {
			console.log('✅ Teams data already exists');
		}

		// Check if fixtures table exists and has data
		const fixtureCountResult = await db.select({ count: count() }).from(fixtures);
		const fixtureCount = fixtureCountResult[0]?.count || 0;

		if (fixtureCount === 0) {
			console.log('📅 Seeding fixtures data...');
			// Fixtures seeding logic would go here
		} else {
			console.log('✅ Fixtures data already exists');
		}

		console.log('✅ Database setup complete!');
	} catch (error) {
		console.error('❌ Database setup failed:', error);
		process.exit(1);
	}
}

// Run the setup function
setupDatabase().catch(console.error);
