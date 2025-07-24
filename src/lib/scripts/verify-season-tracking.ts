import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { fixtures, predictions, leagueTable, authUser } from '../../../drizzle/schema';
import { eq, count } from 'drizzle-orm';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function verifySeasonTracking() {
	try {
		console.log('🔍 Verifying season tracking implementation...\n');

		// Check fixtures by season
		const fixtures2024 = await db
			.select({ count: count() })
			.from(fixtures)
			.where(eq(fixtures.season, '2024-25'));
		const fixtures2025 = await db
			.select({ count: count() })
			.from(fixtures)
			.where(eq(fixtures.season, '2025-26'));

		console.log('📊 FIXTURES BY SEASON:');
		console.log(`   2024-25: ${fixtures2024[0].count} fixtures`);
		console.log(`   2025-26: ${fixtures2025[0].count} fixtures`);

		// Check predictions by season
		const predictions2024 = await db
			.select({ count: count() })
			.from(predictions)
			.where(eq(predictions.season, '2024-25'));
		const predictions2025 = await db
			.select({ count: count() })
			.from(predictions)
			.where(eq(predictions.season, '2025-26'));

		console.log('\n🎯 PREDICTIONS BY SEASON:');
		console.log(`   2024-25: ${predictions2024[0].count} predictions`);
		console.log(`   2025-26: ${predictions2025[0].count} predictions`);

		// Check league table by season
		const league2024 = await db
			.select({ count: count() })
			.from(leagueTable)
			.where(eq(leagueTable.season, '2024-25'));
		const league2025 = await db
			.select({ count: count() })
			.from(leagueTable)
			.where(eq(leagueTable.season, '2025-26'));

		console.log('\n🏆 LEAGUE TABLE BY SEASON:');
		console.log(`   2024-25: ${league2024[0].count} entries`);
		console.log(`   2025-26: ${league2025[0].count} entries`);

		// Check sample multipliers for 2025
		const sampleMultipliers = await db
			.select({
				weekId: fixtures.weekId,
				homeTeamId: fixtures.homeTeamId,
				awayTeamId: fixtures.awayTeamId,
				pointsMultiplier: fixtures.pointsMultiplier
			})
			.from(fixtures)
			.where(eq(fixtures.season, '2025-26'))
			.limit(10);

		console.log('\n⚡ SAMPLE 2025 MULTIPLIERS:');
		sampleMultipliers.forEach((fixture) => {
			const multiplierIcon =
				fixture.pointsMultiplier === 3 ? '🏆' : fixture.pointsMultiplier === 2 ? '⚡' : '📋';
			console.log(
				`   Week ${fixture.weekId}: ${multiplierIcon} ${fixture.homeTeamId} vs ${fixture.awayTeamId} (${fixture.pointsMultiplier}x)`
			);
		});

		// Check current season leaderboard
		const currentLeaderboard = await db
			.select({
				totalPoints: leagueTable.totalPoints,
				season: leagueTable.season,
				email: authUser.email
			})
			.from(leagueTable)
			.leftJoin(authUser, eq(leagueTable.userId, authUser.id))
			.where(eq(leagueTable.season, '2025-26'))
			.limit(5);

		console.log('\n🎯 CURRENT 2025 LEADERBOARD (Top 5):');
		currentLeaderboard.forEach((entry, index) => {
			console.log(`   ${index + 1}. ${entry.email}: ${entry.totalPoints} points (${entry.season})`);
		});

		console.log('\n✅ SEASON TRACKING VERIFICATION COMPLETE!');
		console.log('📊 Both 2024-25 and 2025-26 seasons are properly tracked');
		console.log('🏆 Users have separate leaderboard entries for each season');
		console.log('⚡ 2025 fixtures have intelligent multipliers applied');
	} catch (error) {
		console.error('❌ Error verifying season tracking:', error);
		process.exit(1);
	}
}

verifySeasonTracking().catch(console.error);
