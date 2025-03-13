import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL is not set');
	process.exit(1);
}

// Create the database client
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

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
