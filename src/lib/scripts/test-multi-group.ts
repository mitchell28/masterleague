import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { groupMemberships, groups, authUser, leagueTable } from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function testMultiGroupLeaderboard() {
	try {
		console.log('🔍 Testing multi-group leaderboard functionality...');

		// Pick a user to test with (Mia Davis should be in 2 groups now)
		const testUser = await db
			.select()
			.from(authUser)
			.where(eq(authUser.email, 'mia.davis608@example.com'))
			.limit(1);

		if (testUser.length === 0) {
			console.log('❌ Test user not found');
			return;
		}

		const userId = testUser[0].id;
		console.log(`\n👤 Testing with user: ${testUser[0].name || testUser[0].email}`);

		// Get user's groups (same query as leaderboard page)
		const userGroups = await db
			.select({
				id: groups.id,
				name: groups.name,
				description: groups.description
			})
			.from(groupMemberships)
			.innerJoin(groups, eq(groupMemberships.groupId, groups.id))
			.where(and(eq(groupMemberships.userId, userId), eq(groupMemberships.isActive, true)));

		console.log(`\n📊 User belongs to ${userGroups.length} groups:`);
		userGroups.forEach((group, index) => {
			console.log(`   ${index + 1}. ${group.name} (${group.id})`);
			if (group.description) {
				console.log(`      ${group.description}`);
			}
		});

		// Test leaderboard for each group
		for (const group of userGroups) {
			console.log(`\n🏆 ${group.name} Leaderboard:`);

			const leaderboard = await db
				.select({
					username: authUser.name,
					email: authUser.email,
					totalPoints: leagueTable.totalPoints,
					season: leagueTable.season
				})
				.from(leagueTable)
				.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
				.where(and(eq(leagueTable.season, '2025-26'), eq(leagueTable.groupId, group.id)));

			leaderboard.forEach((entry, index) => {
				console.log(
					`   ${index + 1}. ${entry.username || entry.email}: ${entry.totalPoints} points`
				);
			});

			if (leaderboard.length === 0) {
				console.log('   (No entries found)');
			}
		}

		console.log('\n✅ Multi-group leaderboard test complete!');
		console.log('📱 Users can now switch between groups using the dropdown in the UI');
	} catch (error) {
		console.error('❌ Test failed:', error);
	}
}

testMultiGroupLeaderboard().catch(console.error);
