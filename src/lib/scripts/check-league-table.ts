import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { leagueTable } from '../lib/server/db/schema';
import { user as authUser } from '../lib/server/db/auth/auth-schema';
import { eq, desc } from 'drizzle-orm';

// Load environment variables from .env file
dotenv.config();

// Set up database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

/**
 * Script to check the league table directly
 */
async function checkLeagueTable() {
	try {
		console.log('🔍 Checking league table...');

		// Get league table with user info
		const leagueEntries = await db
			.select({
				id: leagueTable.id,
				userId: leagueTable.userId,
				name: authUser.name,
				email: authUser.email,
				totalPoints: leagueTable.totalPoints,
				correctScorelines: leagueTable.correctScorelines,
				correctOutcomes: leagueTable.correctOutcomes,
				lastUpdated: leagueTable.lastUpdated
			})
			.from(leagueTable)
			.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
			.orderBy(desc(leagueTable.totalPoints));

		// Print table
		console.log('\nCurrent League Table:');
		console.log('====================================================================');
		console.log('Rank | User                 | Points | Correct Scores | Correct Outcomes');
		console.log('====================================================================');

		leagueEntries.forEach((entry, index) => {
			const userInfo = `${entry.name} (${entry.email.substring(0, 15)}...)`;
			console.log(
				`${String(index + 1).padEnd(4)} | ${userInfo.padEnd(21)} | ${String(entry.totalPoints).padEnd(6)} | ${String(entry.correctScorelines).padEnd(14)} | ${entry.correctOutcomes}`
			);
		});

		console.log('====================================================================');
		console.log(`Total entries: ${leagueEntries.length}`);
	} catch (error) {
		console.error('❌ Failed to check league table:', error);
		process.exit(1);
	}
}

// Run the function
checkLeagueTable().catch(console.error);
