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

async function checkCurrentFixtures() {
	console.log('🔍 Checking current fixture data for multipliers...');

	try {
		// Get fixtures from week 1 with their multipliers
		const week1Fixtures = await db
			.select({
				id: fixtures.id,
				homeTeamId: fixtures.homeTeamId,
				awayTeamId: fixtures.awayTeamId,
				pointsMultiplier: fixtures.pointsMultiplier,
				status: fixtures.status,
				matchDate: fixtures.matchDate
			})
			.from(fixtures)
			.where(eq(fixtures.weekId, 1));

		console.log(`\n📊 Week 1 fixtures (${week1Fixtures.length} total):`);
		week1Fixtures.forEach((fixture, i) => {
			const multiplierBadge = fixture.pointsMultiplier > 1 ? `🎯 ${fixture.pointsMultiplier}x` : '';
			console.log(
				`${i + 1}. ${fixture.homeTeamId} vs ${fixture.awayTeamId} | Status: ${fixture.status} | Multiplier: ${fixture.pointsMultiplier} ${multiplierBadge}`
			);
		});

		// Check multiplier distribution
		const multiplierCounts = week1Fixtures.reduce(
			(acc, fixture) => {
				acc[fixture.pointsMultiplier] = (acc[fixture.pointsMultiplier] || 0) + 1;
				return acc;
			},
			{} as Record<number, number>
		);

		console.log('\n📈 Multiplier distribution:');
		Object.entries(multiplierCounts).forEach(([multiplier, count]) => {
			console.log(`   ${multiplier}x points: ${count} fixtures`);
		});
	} catch (error) {
		console.error('❌ Error checking fixtures:', error);
	}
}

checkCurrentFixtures().catch(console.error);
