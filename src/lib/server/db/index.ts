import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { getDatabase } from '../utils/env';
import * as appSchema from './schema';
import * as authSchema from './auth/auth-schema';

// Get database URL - prioritizes process.env which works in both contexts
const { url: DATABASE_URL } = getDatabase();

if (!DATABASE_URL) {
	throw new Error("DATABASE_URL is not set. Make sure it's available in process.env");
}

// Create the Neon PostgreSQL client with connection options
const sql = neon(DATABASE_URL, {
	fetchOptions: {
		cache: 'no-store',
		keepalive: true
	}
});

// Export the database connection with both schemas
export const db = drizzle(sql, {
	schema: {
		...appSchema,
		...authSchema
	}
});

// Export game-related tables from app schema
export const { teams, fixtures, predictions, leagueTable, organization, member, invitation } =
	appSchema;

// Export auth-related tables from auth schema
export const {
	user, // Primary user table (auth_user)
	session, // Auth session
	account,
	verification,
	rateLimit
} = authSchema;

// Also export user table as authUser for explicit clarity if needed
export const { user: authUser } = authSchema;

// Re-export types from game schema and auth schema
export type { Team, Fixture, Prediction, LeagueTable } from './schema';
export type {
	AuthUser,
	AuthSession,
	AuthAccount,
	AuthVerification,
	RateLimit
} from './auth/auth-schema';
