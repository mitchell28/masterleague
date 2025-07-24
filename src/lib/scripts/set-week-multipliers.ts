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

async function setRandomMultipliersForWeek(weekId: number): Promise<void> {
	console.log(`🎯 Setting random multipliers for week ${weekId}...`);

	// Get all fixtures for the week
	const weekFixtures = await db.select().from(fixtures).where(eq(fixtures.weekId, weekId));

	if (weekFixtures.length === 0) {
		console.log(`No fixtures found for week ${weekId}`);
		return;
	}

	console.log(`📊 Found ${weekFixtures.length} fixtures for week ${weekId}`);

	// Set multipliers: 60% normal (1x), 30% double (2x), 10% triple (3x)
	const multiplierUpdates = weekFixtures.map((fixture) => {
		const rand = Math.random();
		let multiplier = 1;

		if (rand < 0.1) {
			multiplier = 3; // 10% chance for 3x
		} else if (rand < 0.4) {
			multiplier = 2; // 30% chance for 2x
		}
		// 60% chance for 1x (default)

		return { fixtureId: fixture.id, multiplier };
	});

	// Update each fixture with its new multiplier
	for (const update of multiplierUpdates) {
		await db
			.update(fixtures)
			.set({ pointsMultiplier: update.multiplier })
			.where(eq(fixtures.id, update.fixtureId));
	}

	// Log summary
	const multiplierCounts = multiplierUpdates.reduce(
		(acc, update) => {
			acc[update.multiplier] = (acc[update.multiplier] || 0) + 1;
			return acc;
		},
		{} as Record<number, number>
	);

	console.log('\n✅ Multipliers set successfully!');
	Object.entries(multiplierCounts).forEach(([multiplier, count]) => {
		console.log(`   ${multiplier}x points: ${count} fixtures`);
	});
}

async function setMultipliersForCurrentWeek() {
	try {
		// Set multipliers for week 1 (current week for testing)
		await setRandomMultipliersForWeek(1);

		// Verify by checking a few fixtures
		console.log('\n🔍 Verification sample:');
		const sampleFixtures = await db
			.select({
				homeTeamId: fixtures.homeTeamId,
				awayTeamId: fixtures.awayTeamId,
				pointsMultiplier: fixtures.pointsMultiplier
			})
			.from(fixtures)
			.where(eq(fixtures.weekId, 1))
			.limit(5);

		sampleFixtures.forEach((fixture, i) => {
			const badge = fixture.pointsMultiplier > 1 ? `🎯 ${fixture.pointsMultiplier}x` : '';
			console.log(`   ${i + 1}. ${fixture.homeTeamId} vs ${fixture.awayTeamId} ${badge}`);
		});
	} catch (error) {
		console.error('❌ Error setting multipliers:', error);
		process.exit(1);
	}
}

setMultipliersForCurrentWeek().catch(console.error);
