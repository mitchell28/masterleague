import * as dotenv from 'dotenv';
import './db-connection'; // Import this first to set up the environment
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from '../server/db';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

/**
 * Script to run database migrations
 */
async function runMigrations() {
	console.log('🔄 Running database migrations...');

	try {
		// Run migrations from the "drizzle" folder at the root
		const migrationsFolder = path.resolve(process.cwd(), 'drizzle');

		// Execute the migrations
		await migrate(db, { migrationsFolder });

		console.log('✅ Database migrations completed successfully!');
	} catch (error) {
		console.error('❌ Database migration failed:', error);
		process.exit(1);
	}
}

// Run the migration function
runMigrations().catch(console.error);
