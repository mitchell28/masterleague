import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from '$lib/server/db/schema';
import * as authSchema from '$lib/server/db/auth/auth-schema';

let testDb: ReturnType<typeof drizzle>;
let testConnection: ReturnType<typeof postgres>;

/**
 * Initialize test database connection
 */
export async function setupTestDatabase() {
	// Use test database URL or fallback to main database with test prefix
	const databaseUrl =
		process.env.TEST_DATABASE_URL ||
		process.env.DATABASE_URL?.replace(/\/([^\/]+)$/, '/test_$1') ||
		'postgresql://localhost:5432/test_masterleague';

	console.log('Setting up test database connection...');

	testConnection = postgres(databaseUrl, {
		max: 1,
		transform: postgres.camel
	});

	testDb = drizzle(testConnection, { schema: { ...schema, ...authSchema } });

	// Run migrations on test database
	try {
		await migrate(testDb, { migrationsFolder: './drizzle' });
		console.log('Test database migrations completed');
	} catch (error) {
		console.warn('Migration warning (might be expected):', error);
	}

	return testDb;
}

/**
 * Get the test database instance
 */
export function getTestDb() {
	if (!testDb) {
		throw new Error('Test database not initialized. Call setupTestDatabase() first.');
	}
	return testDb;
}

/**
 * Close test database connection
 */
export async function cleanupTestDatabase() {
	if (testConnection) {
		await testConnection.end();
		console.log('Test database connection closed');
	}
}

/**
 * Clear all tables for test isolation
 */
export async function clearAllTables() {
	const db = getTestDb();

	// Get all table names from schema
	const tables = [
		'auth_rate_limit',
		'auth_verification',
		'predictions',
		'league_table',
		'auth_session',
		'auth_account',
		'member',
		'invitation',
		'organization',
		'auth_user',
		'subscriptions',
		'fixtures',
		'teams'
	];

	// Disable foreign key checks and truncate all tables
	try {
		await db.execute(sql`SET session_replication_role = replica;`);

		for (const table of tables) {
			await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE;`));
		}

		await db.execute(sql`SET session_replication_role = DEFAULT;`);
	} catch (error) {
		console.warn('Table clearing warning:', error);
	}
}

/**
 * Reset database to clean state with optional seed data
 */
export async function resetDatabase(withSeedData = false) {
	await clearAllTables();

	if (withSeedData) {
		await seedBasicData();
	}
}

/**
 * Seed basic data for testing
 */
export async function seedBasicData() {
	const db = getTestDb();

	// Insert basic teams
	await db.insert(schema.teams).values([
		{ id: 'arsenal', name: 'Arsenal', shortName: 'ARS', logo: null },
		{ id: 'chelsea', name: 'Chelsea', shortName: 'CHE', logo: null },
		{ id: 'liverpool', name: 'Liverpool', shortName: 'LIV', logo: null },
		{ id: 'manunited', name: 'Manchester United', shortName: 'MUN', logo: null },
		{ id: 'mancity', name: 'Manchester City', shortName: 'MCI', logo: null },
		{ id: 'tottenham', name: 'Tottenham Hotspur', shortName: 'TOT', logo: null }
	]);

	// Insert test organization
	await db.insert(schema.organization).values({
		id: 'test-org',
		name: 'Test Organization',
		slug: 'test-org',
		logo: null,
		metadata: null,
		createdAt: new Date(),
		updatedAt: new Date()
	});

	console.log('Basic test data seeded');
}
