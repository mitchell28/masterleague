import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { leagueTable, authUser } from '../../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function testLeaderboardQuery() {
	try {
		console.log('🔍 Testing leaderboard query...');

		// First, check if season column exists
		const tableInfo = await sql`
			SELECT column_name, data_type, is_nullable, column_default
			FROM information_schema.columns 
			WHERE table_name = 'league_table'
			ORDER BY ordinal_position;
		`;

		console.log('\n📊 league_table columns:');
		tableInfo.forEach((col) => {
			console.log(`   ${col.column_name}: ${col.data_type} (default: ${col.column_default})`);
		});

		// Test simple select
		const simpleTest = await db.select().from(leagueTable).limit(1);
		console.log(`\n✅ Simple select works: ${simpleTest.length} rows`);

		// Test with season filter
		const seasonTest = await db
			.select()
			.from(leagueTable)
			.where(eq(leagueTable.season, '2025-26'))
			.limit(1);
		console.log(`✅ Season filter works: ${seasonTest.length} rows`);

		// Test join with authUser
		const joinTest = await db
			.select({
				id: leagueTable.userId,
				username: authUser.name,
				totalPoints: leagueTable.totalPoints,
				season: leagueTable.season
			})
			.from(leagueTable)
			.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
			.where(eq(leagueTable.season, '2025-26'))
			.limit(3);

		console.log(`\n🏆 Join query works: ${joinTest.length} rows`);
		joinTest.forEach((row, index) => {
			console.log(`   ${index + 1}. ${row.username}: ${row.totalPoints} points (${row.season})`);
		});

		console.log('\n✅ All queries working correctly!');
	} catch (error) {
		console.error('❌ Query test failed:', error);
		process.exit(1);
	}
}

testLeaderboardQuery().catch(console.error);
