import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { fixtures } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function checkFixtures() {
	console.log('🔍 Checking fixture statuses and multipliers...');

	try {
		// Get week 1 fixtures
		const week1Fixtures = await db.select().from(fixtures).where(eq(fixtures.weekId, 1));

		console.log(`\n📊 Week 1 Fixtures (${week1Fixtures.length} total):`);
		console.log('========================================');

		week1Fixtures.forEach((fixture, index) => {
			console.log(`${index + 1}. ${fixture.homeTeamId} vs ${fixture.awayTeamId}`);
			console.log(`   Status: ${fixture.status}`);
			console.log(`   Multiplier: ${fixture.pointsMultiplier}x`);
			console.log(`   Match Date: ${fixture.matchDate}`);
			console.log('');
		});

		// Get status summary
		const statusCounts = week1Fixtures.reduce(
			(acc, fixture) => {
				acc[fixture.status] = (acc[fixture.status] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		console.log('📈 Status Summary:');
		Object.entries(statusCounts).forEach(([status, count]) => {
			console.log(`   ${status}: ${count} fixtures`);
		});

		// Get multiplier summary
		const multiplierCounts = week1Fixtures.reduce(
			(acc, fixture) => {
				const mult = fixture.pointsMultiplier || 1;
				acc[mult] = (acc[mult] || 0) + 1;
				return acc;
			},
			{} as Record<number, number>
		);

		console.log('\n🎯 Multiplier Summary:');
		Object.entries(multiplierCounts).forEach(([mult, count]) => {
			console.log(`   ${mult}x points: ${count} fixtures`);
		});
	} catch (error) {
		console.error('❌ Error checking fixtures:', error);
	}
}

checkFixtures();
