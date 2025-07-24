import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { leagueTable, authUser, groups } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function createLeaderboard2025() {
	try {
		console.log('🏆 Creating 2025-26 season leaderboard entries...');

		// Get all users and a default group
		const users = await db.select({ id: authUser.id, email: authUser.email }).from(authUser);
		const defaultGroup = await db.select({ id: groups.id }).from(groups).limit(1);

		if (defaultGroup.length === 0) {
			console.error('❌ No groups found. Need at least one group to create leaderboard entries.');
			process.exit(1);
		}

		const groupId = defaultGroup[0].id;
		console.log(`📊 Found ${users.length} users and using group ${groupId}`);

		// Create 2025-26 leaderboard entries for each user
		let created = 0;
		for (const user of users) {
			try {
				await db.insert(leagueTable).values({
					id: `${user.id}-2025`,
					userId: user.id,
					totalPoints: 0,
					correctScorelines: 0,
					correctOutcomes: 0,
					predictedFixtures: 0,
					completedFixtures: 0,
					lastUpdated: new Date().toISOString(),
					groupId: groupId,
					season: '2025-26'
				});
				created++;
				console.log(`✅ Created 2025 entry for ${user.email}`);
			} catch (error) {
				console.log(`⚠️ Entry may already exist for ${user.email}`);
			}
		}

		console.log(`\n🎯 Created ${created} new 2025-26 leaderboard entries`);

		// Verify the creation
		const leaderboard2025 = await db
			.select({
				username: authUser.name,
				email: authUser.email,
				totalPoints: leagueTable.totalPoints,
				season: leagueTable.season
			})
			.from(leagueTable)
			.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
			.where(eq(leagueTable.season, '2025-26'))
			.limit(5);

		console.log('\n🏆 Current 2025-26 Leaderboard:');
		leaderboard2025.forEach((entry, index) => {
			console.log(`   ${index + 1}. ${entry.username || entry.email}: ${entry.totalPoints} points`);
		});

		console.log('\n✅ 2025-26 season leaderboard ready!');
	} catch (error) {
		console.error('❌ Error creating 2025 leaderboard:', error);
		process.exit(1);
	}
}

createLeaderboard2025().catch(console.error);
