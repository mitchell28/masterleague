import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getDatabase } from '../utils/env';
import * as appSchema from './schema';
import * as authSchema from './auth/auth-schema';

// Get database URL - prioritizes process.env which works in both contexts
const { url: DATABASE_URL } = getDatabase();

if (!DATABASE_URL) {
	throw new Error("DATABASE_URL is not set. Make sure it's available in process.env");
}

// Create the PostgreSQL client with connection options
const client = postgres(DATABASE_URL);

// Export the database connection with both schemas
export const db = drizzle(client, { schema: { ...appSchema, ...authSchema } });

// Export game-related tables from app schema
export const { teams, fixtures, predictions, leagueTable } = appSchema;

// Export auth-related tables from auth schema
export const {
	user, // Primary user table (user)
	session, // Auth session
	account,
	verification,
	rateLimit,
	// Organization plugin tables
	organization,
	member,
	invitation
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
	RateLimit,
	Organization,
	Member,
	Invitation
} from './auth/auth-schema';
