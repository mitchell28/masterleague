import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { fixtures } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Load environment variables from .env file
dotenv.config();

// Set up database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function checkFixtureStatuses() {
	console.log('🔍 Checking fixture statuses and multipliers...');

	try {
		// Get first few fixtures from week 1
		const week1Fixtures = await db.select().from(fixtures).where(eq(fixtures.weekId, 1)).limit(5);

		console.log(`\n📊 Sample fixtures from week 1:`);
		week1Fixtures.forEach((fixture, i) => {
			console.log(
				`${i + 1}. Status: "${fixture.status}" | Multiplier: ${fixture.pointsMultiplier} | Date: ${fixture.matchDate}`
			);
		});

		// Get unique statuses
		const randomFixtures = await db
			.select({
				status: fixtures.status,
				pointsMultiplier: fixtures.pointsMultiplier
			})
			.from(fixtures)
			.limit(20);

		const uniqueStatuses = [...new Set(randomFixtures.map((f) => f.status))];
		const uniqueMultipliers = [...new Set(randomFixtures.map((f) => f.pointsMultiplier))];

		console.log(`\n📈 Found statuses: ${uniqueStatuses.join(', ')}`);
		console.log(`📈 Found multipliers: ${uniqueMultipliers.join(', ')}`);
	} catch (error) {
		console.error('❌ Error checking fixtures:', error);
	}
}

checkFixtureStatuses().catch(console.error);
