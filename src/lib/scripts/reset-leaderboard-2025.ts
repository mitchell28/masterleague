import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { leagueTable, authUser, groups } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Load environment variables from .env file
dotenv.config();

// Set up database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function resetLeaderboardFor2025() {
	console.log('🏆 Resetting leaderboard for 2025 season...');

	try {
		// Get all users
		const users = await db.select().from(authUser);
		console.log(`📊 Found ${users.length} users`);

		// Get all groups (assuming users belong to groups)
		const allGroups = await db.select().from(groups);
		console.log(`🏟️ Found ${allGroups.length} groups`);

		// For now, let's assume users belong to the first group or create a default group
		let defaultGroupId = null;
		if (allGroups.length > 0) {
			defaultGroupId = allGroups[0].id;
		} else {
			// Create a default group if none exist
			const newGroup = {
				id: randomUUID(),
				name: 'Default League',
				description: 'Default league for 2025 season',
				ownerId: users[0]?.id || 'system',
				maxMembers: 100,
				isActive: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};
			await db.insert(groups).values(newGroup);
			defaultGroupId = newGroup.id;
			console.log(`✅ Created default group: ${newGroup.name}`);
		}

		// Clear existing leaderboard entries
		await db.delete(leagueTable);
		console.log('🗑️ Cleared existing leaderboard entries');

		// Create fresh leaderboard entries for all users
		const leaderboardEntries = users.map((user) => ({
			id: randomUUID(),
			userId: user.id,
			totalPoints: 0,
			correctScorelines: 0,
			correctOutcomes: 0,
			predictedFixtures: 0,
			completedFixtures: 0,
			lastUpdated: new Date().toISOString(),
			groupId: defaultGroupId
		}));

		// Insert new leaderboard entries
		if (leaderboardEntries.length > 0) {
			await db.insert(leagueTable).values(leaderboardEntries);
			console.log(`✅ Created ${leaderboardEntries.length} fresh leaderboard entries`);
		}

		// Verify the reset
		const newLeaderboard = await db.select().from(leagueTable);
		console.log(`📋 Leaderboard now has ${newLeaderboard.length} entries`);

		console.log('\n🎉 2025 LEADERBOARD RESET COMPLETE!');
		console.log('======================================');
		console.log('✅ All user points reset to 0');
		console.log('✅ All statistics reset to 0');
		console.log('✅ Ready for 2025 season predictions');
		console.log('\n📝 Next steps:');
		console.log('   1. Users can start making predictions for 2025 fixtures');
		console.log('   2. Points will be calculated automatically as matches complete');
		console.log('   3. Leaderboard will update in real-time');
	} catch (error) {
		console.error('❌ Error resetting leaderboard:', error);
		process.exit(1);
	}
}

resetLeaderboardFor2025().catch(console.error);
