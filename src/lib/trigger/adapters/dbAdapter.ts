import { drizzle } from 'drizzle-orm/neon-http';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { DATABASE_URL, DATABASE_AUTH_TOKEN } from './env';

/**
 * Database adapter for Trigger.dev
 *
 * This adapter provides database access that works with Trigger.dev's bundling process,
 * using process.env instead of SvelteKit's $env modules.
 */

// Set up database connection using process.env variables
const sql: NeonQueryFunction<any, any> = neon(DATABASE_URL || '', {
	authToken: DATABASE_AUTH_TOKEN
});

// Export the database client for use in Trigger.dev tasks
export const db = drizzle(sql);
