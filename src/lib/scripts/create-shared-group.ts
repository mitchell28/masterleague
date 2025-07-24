import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { groupMemberships, groups, authUser, leagueTable } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function createSharedGroup() {
	try {
		console.log('👥 Creating a shared group for multiple users...');

		// Get some users
		const users = await db
			.select({ id: authUser.id, email: authUser.email })
			.from(authUser)
			.limit(5);

		if (users.length < 2) {
			console.log('❌ Need at least 2 users to create a shared group');
			return;
		}

		// Create a shared group
		const sharedGroupId = randomUUID();
		const sharedGroup = {
			id: sharedGroupId,
			name: 'Premier League Masters 2025',
			description: 'A competitive group for the best predictors',
			ownerId: users[0].id,
			maxMembers: 20,
			isActive: true,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		await db.insert(groups).values(sharedGroup);
		console.log(`✅ Created shared group: ${sharedGroup.name}`);

		// Add multiple users to this group
		let added = 0;
		for (const user of users) {
			try {
				await db.insert(groupMemberships).values({
					id: randomUUID(),
					groupId: sharedGroupId,
					userId: user.id,
					role: user.id === users[0].id ? 'owner' : 'member',
					joinedAt: new Date().toISOString(),
					isActive: true
				});
				console.log(`✅ Added ${user.email} to shared group`);
				added++;
			} catch (error) {
				console.log(`⚠️ User ${user.email} may already be in group`);
			}
		}

		console.log(`\n🎯 Added ${added} users to shared group`);

		// Now run the leaderboard creation script for the new group
		console.log('\n🏆 Creating leaderboard entries for shared group...');

		for (const user of users) {
			try {
				await db.insert(leagueTable).values({
					id: `${user.id}-${sharedGroupId}-2025`,
					userId: user.id,
					totalPoints: 0,
					correctScorelines: 0,
					correctOutcomes: 0,
					predictedFixtures: 0,
					completedFixtures: 0,
					lastUpdated: new Date().toISOString(),
					groupId: sharedGroupId,
					season: '2025-26'
				});
				console.log(`✅ Created leaderboard entry for ${user.email}`);
			} catch (error) {
				console.log(`⚠️ Leaderboard entry may already exist for ${user.email}`);
			}
		}

		console.log('\n✅ Shared group setup complete!');
		console.log(
			`📊 Users can now select between their individual leagues and "${sharedGroup.name}"`
		);
	} catch (error) {
		console.error('❌ Error creating shared group:', error);
		process.exit(1);
	}
}

createSharedGroup().catch(console.error);
