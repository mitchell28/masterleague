import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { leagueTable, authUser, groupMemberships, groups } from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function createGroupSpecificLeaderboard() {
	try {
		console.log('🏆 Creating group-specific 2025-26 season leaderboard entries...');

		// Get all active group memberships
		const memberships = await db
			.select({
				userId: groupMemberships.userId,
				groupId: groupMemberships.groupId,
				userName: authUser.name,
				userEmail: authUser.email,
				groupName: groups.name
			})
			.from(groupMemberships)
			.innerJoin(authUser, eq(groupMemberships.userId, authUser.id))
			.innerJoin(groups, eq(groupMemberships.groupId, groups.id))
			.where(eq(groupMemberships.isActive, true));

		console.log(`📊 Found ${memberships.length} active group memberships`);

		// Create leaderboard entries for each user-group combination
		let created = 0;
		let alreadyExists = 0;

		for (const membership of memberships) {
			try {
				await db.insert(leagueTable).values({
					id: `${membership.userId}-${membership.groupId}-2025`,
					userId: membership.userId,
					totalPoints: 0,
					correctScorelines: 0,
					correctOutcomes: 0,
					predictedFixtures: 0,
					completedFixtures: 0,
					lastUpdated: new Date().toISOString(),
					groupId: membership.groupId,
					season: '2025-26'
				});
				created++;
				console.log(
					`✅ Created entry: ${membership.userName || membership.userEmail} in ${membership.groupName}`
				);
			} catch (error) {
				alreadyExists++;
				// Entry already exists, skip
			}
		}

		console.log(`\n🎯 Results:`);
		console.log(`   Created: ${created} new entries`);
		console.log(`   Already existed: ${alreadyExists} entries`);

		// Show group breakdown
		const groupBreakdown = memberships.reduce(
			(acc, membership) => {
				if (!acc[membership.groupName]) {
					acc[membership.groupName] = 0;
				}
				acc[membership.groupName]++;
				return acc;
			},
			{} as Record<string, number>
		);

		console.log(`\n📋 Group breakdown:`);
		Object.entries(groupBreakdown).forEach(([groupName, count]) => {
			console.log(`   ${groupName}: ${count} members`);
		});

		// Verify by showing sample leaderboard for each group
		const groupIds = [...new Set(memberships.map((m) => m.groupId))];

		for (const groupId of groupIds) {
			const groupName = memberships.find((m) => m.groupId === groupId)?.groupName;
			const groupLeaderboard = await db
				.select({
					username: authUser.name,
					email: authUser.email,
					totalPoints: leagueTable.totalPoints,
					season: leagueTable.season
				})
				.from(leagueTable)
				.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
				.where(and(eq(leagueTable.season, '2025-26'), eq(leagueTable.groupId, groupId)))
				.limit(3);

			console.log(`\n🏆 ${groupName} Leaderboard (sample):`);
			groupLeaderboard.forEach((entry, index) => {
				console.log(
					`   ${index + 1}. ${entry.username || entry.email}: ${entry.totalPoints} points`
				);
			});
		}

		console.log('\n✅ Group-specific 2025-26 season leaderboard ready!');
	} catch (error) {
		console.error('❌ Error creating group-specific leaderboard:', error);
		process.exit(1);
	}
}

createGroupSpecificLeaderboard().catch(console.error);
