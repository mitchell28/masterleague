import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '$env/static/private';
import * as appSchema from './schema';
import * as authSchema from './auth/auth-schema';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Create the Neon PostgreSQL client
const sql = neon(DATABASE_URL);

// Export the database connection with both schemas
export const db = drizzle(sql, {
	schema: {
		...appSchema,
		...authSchema
	}
});

// Export game-related tables from app schema
export const { teams, fixtures, predictions, leagueTable } = appSchema;

// Export auth-related tables from auth schema
export const {
	user, // Primary user table (auth_user)
	session, // Auth session
	account,
	verification
} = authSchema;

// Also export user table as authUser for explicit clarity if needed
export const { user: authUser } = authSchema;

// Re-export types from game schema
export type { Team, Fixture, Prediction, LeagueTable } from './schema';

// Export auth types
export type { AuthUser, AuthSession, AuthAccount, AuthVerification } from './auth/auth-schema';
