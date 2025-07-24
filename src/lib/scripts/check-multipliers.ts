import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { fixtures } from '../../../drizzle/schema';
import { gt } from 'drizzle-orm';

// Load environment variables from .env file
dotenv.config();

// Set up database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function checkMultipliers() {
	console.log('🔍 Checking for fixtures with multipliers > 1...');

	try {
		// Get fixtures with multiplier > 1
		const multiplierFixtures = await db
			.select()
			.from(fixtures)
			.where(gt(fixtures.pointsMultiplier, 1));

		console.log(`\n📊 Found ${multiplierFixtures.length} fixtures with multipliers > 1:`);
		multiplierFixtures.forEach((fixture, i) => {
			console.log(
				`${i + 1}. Week ${fixture.weekId} | Multiplier: ${fixture.pointsMultiplier} | Teams: ${fixture.homeTeamId} vs ${fixture.awayTeamId}`
			);
		});

		if (multiplierFixtures.length === 0) {
			console.log('💡 All fixtures have multiplier = 1. Need to set random multipliers!');
		}
	} catch (error) {
		console.error('❌ Error checking multipliers:', error);
	}
}

checkMultipliers().catch(console.error);
