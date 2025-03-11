import { db } from './index';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { seedAdminUser, applySchemaChanges } from './seed';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

/**
 * Main setup function that initializes the database
 */
export async function setupDatabase(forceReset = false) {
	console.log('🔧 Setting up database...');

	try {
		// Run migrations if needed
		await runMigrations();

		// Apply any schema changes
		await applySchemaChanges();

		// Create admin user if it doesn't exist
		await seedAdminUser();

		// Seed teams if they don't exist
		await seedTeams();

		console.log('✅ Database setup completed successfully');

		return { success: true };
	} catch (error) {
		console.error('❌ Database setup failed:', error);
		return { success: false, error };
	}
}

/**
 * Run database migrations using Drizzle ORM
 */
async function runMigrations() {
	console.log('📊 Running migrations...');
	try {
		// With Neon serverless, we use this migration approach
		// The actual migration files should be generated using drizzle-kit
		await migrate(db, { migrationsFolder: './drizzle' });
		console.log('✅ Migrations completed');
	} catch (error) {
		console.error('❌ Migration failed:', error);
		throw error;
	}
}

/**
 * Seeds initial teams data if not already present
 */
async function seedTeams() {
	// Check if teams already exist
	const existingTeams = await db.select().from(schema.teams).limit(1);

	if (existingTeams.length > 0) {
		console.log('Teams already exist, skipping seed');
		return;
	}

	console.log('🏆 Seeding teams...');

	// Premier League teams
	const premierLeagueTeams = [
		{ name: 'Arsenal', shortName: 'ARS', logo: '/teams/arsenal.png' },
		{ name: 'Aston Villa', shortName: 'AVL', logo: '/teams/aston-villa.png' },
		{ name: 'Bournemouth', shortName: 'BOU', logo: '/teams/bournemouth.png' },
		{ name: 'Brentford', shortName: 'BRE', logo: '/teams/brentford.png' },
		{ name: 'Brighton', shortName: 'BHA', logo: '/teams/brighton.png' },
		{ name: 'Chelsea', shortName: 'CHE', logo: '/teams/chelsea.png' },
		{ name: 'Crystal Palace', shortName: 'CRY', logo: '/teams/crystal-palace.png' },
		{ name: 'Everton', shortName: 'EVE', logo: '/teams/everton.png' },
		{ name: 'Fulham', shortName: 'FUL', logo: '/teams/fulham.png' },
		{ name: 'Liverpool', shortName: 'LIV', logo: '/teams/liverpool.png' },
		{ name: 'Manchester City', shortName: 'MCI', logo: '/teams/man-city.png' },
		{ name: 'Manchester United', shortName: 'MUN', logo: '/teams/man-utd.png' },
		{ name: 'Newcastle', shortName: 'NEW', logo: '/teams/newcastle.png' },
		{ name: 'Nottingham Forest', shortName: 'NFO', logo: '/teams/nottingham-forest.png' },
		{ name: 'Southampton', shortName: 'SOU', logo: '/teams/southampton.png' },
		{ name: 'Tottenham', shortName: 'TOT', logo: '/teams/tottenham.png' },
		{ name: 'West Ham', shortName: 'WHU', logo: '/teams/west-ham.png' },
		{ name: 'Wolves', shortName: 'WOL', logo: '/teams/wolves.png' },
		{ name: 'Ipswich Town', shortName: 'IPS', logo: '/teams/ipswich.png' },
		{ name: 'Leicester City', shortName: 'LEI', logo: '/teams/leicester.png' }
	];

	// Insert teams with UUID primary keys
	const teamsWithIds = premierLeagueTeams.map((team) => ({
		id: randomUUID(),
		name: team.name,
		shortName: team.shortName,
		logo: team.logo
	}));

	try {
		await db.insert(schema.teams).values(teamsWithIds);
		console.log(`✅ Successfully seeded ${teamsWithIds.length} teams`);
	} catch (error) {
		console.error('❌ Team seeding failed:', error);
		throw error;
	}
}

/**
 * Reset the database (CAREFUL: this deletes all data)
 */
export async function resetDatabase() {
	console.warn('⚠️ RESETTING DATABASE - ALL DATA WILL BE LOST ⚠️');

	try {
		// Delete all data from tables in the correct order (respecting foreign keys)
		await db.delete(schema.predictions);
		await db.delete(schema.leagueTable);
		await db.delete(schema.fixtures);
		await db.delete(schema.session);
		await db.delete(schema.user);
		await db.delete(schema.teams);

		console.log('🗑️ Database reset complete');

		// Set up again with fresh data
		return setupDatabase();
	} catch (error) {
		console.error('❌ Database reset failed:', error);
		return { success: false, error };
	}
}

// If this file is run directly, execute the setup
if (require.main === module) {
	setupDatabase().then((result) => {
		if (result.success) {
			console.log('Database setup completed successfully');
			process.exit(0);
		} else {
			console.error('Database setup failed:', result.error);
			process.exit(1);
		}
	});
}
