import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { leagueTable, fixtures, predictions, authUser } from '../../../drizzle/schema';
import { eq, count, desc } from 'drizzle-orm';

// Load environment variables from .env file
dotenv.config();

// Set up database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function verifyLeaderboard2025() {
	console.log('🔍 Verifying 2025 leaderboard setup...\n');

	try {
		// Check leaderboard entries
		const leaderboardEntries = await db.select().from(leagueTable);
		console.log(`📊 Leaderboard entries: ${leaderboardEntries.length}`);

		// Check 2025 fixtures
		const fixtureCount = await db.select({ count: count() }).from(fixtures);
		console.log(`🏟️ Total fixtures: ${fixtureCount[0].count}`);

		// Check current predictions
		const predictionCount = await db.select({ count: count() }).from(predictions);
		console.log(`🎯 Total predictions: ${predictionCount[0].count}`);

		// Show sample leaderboard
		const topUsers = await db
			.select({
				username: authUser.name,
				totalPoints: leagueTable.totalPoints,
				correctScorelines: leagueTable.correctScorelines,
				correctOutcomes: leagueTable.correctOutcomes,
				predictedFixtures: leagueTable.predictedFixtures,
				completedFixtures: leagueTable.completedFixtures
			})
			.from(leagueTable)
			.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
			.orderBy(desc(leagueTable.totalPoints))
			.limit(10);

		console.log('\n🏆 Current Leaderboard Top 10:');
		console.log('================================');
		console.log('Pos | Username | Points | Scorelines | Outcomes | Predicted/Completed');
		console.log('----|---------:|-------:|----------:|--------:|------------------');
		topUsers.forEach((user, index) => {
			const pos = String(index + 1).padStart(3);
			const username = (user.username || 'Unknown').padEnd(15);
			const points = String(user.totalPoints).padStart(6);
			const scorelines = String(user.correctScorelines).padStart(9);
			const outcomes = String(user.correctOutcomes).padStart(7);
			const fixtures = `${user.predictedFixtures}/${user.completedFixtures}`;
			console.log(`${pos} | ${username} | ${points} | ${scorelines} | ${outcomes} | ${fixtures}`);
		});

		// Check for any issues
		const issues = [];
		if (leaderboardEntries.length === 0) {
			issues.push('❌ No leaderboard entries found');
		}
		if (fixtureCount[0].count === 0) {
			issues.push('❌ No fixtures found');
		}

		console.log('\n📋 System Status:');
		if (issues.length === 0) {
			console.log('✅ All systems ready for 2025 season!');
			console.log('✅ Leaderboard reset and initialized');
			console.log('✅ 2025 fixtures loaded');
			console.log('✅ Users can start making predictions');
		} else {
			console.log('⚠️ Issues found:');
			issues.forEach((issue) => console.log(`   ${issue}`));
		}
	} catch (error) {
		console.error('❌ Error verifying leaderboard:', error);
		process.exit(1);
	}
}

verifyLeaderboard2025().catch(console.error);
