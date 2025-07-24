import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { authUser, groupMemberships, groups } from '../../../drizzle/schema';
import { eq, and, count } from 'drizzle-orm';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function debugLeaderboardAccess() {
	try {
		console.log('🔍 Debugging leaderboard access issues...');

		// Check if we have users
		const userCount = await db.select({ count: count() }).from(authUser);
		console.log(`\n👥 Total users in database: ${userCount[0].count}`);

		// Check a specific user's groups
		const users = await db.select().from(authUser).limit(3);

		for (const user of users) {
			console.log(`\n👤 User: ${user.name || user.email}`);
			console.log(`   ID: ${user.id}`);

			const userGroups = await db
				.select({
					id: groups.id,
					name: groups.name,
					description: groups.description
				})
				.from(groupMemberships)
				.innerJoin(groups, eq(groupMemberships.groupId, groups.id))
				.where(and(eq(groupMemberships.userId, user.id), eq(groupMemberships.isActive, true)));

			console.log(`   Groups: ${userGroups.length}`);
			userGroups.forEach((group, i) => {
				console.log(`     ${i + 1}. ${group.name} (${group.id})`);
			});
		}

		// Check if the issue might be session-related
		console.log('\n🔧 Potential issues to check:');
		console.log('   1. Are you signed in? Check /auth/otp');
		console.log('   2. Browser console errors?');
		console.log('   3. Network tab for failed requests?');
		console.log('   4. Clear browser cookies/localStorage');

		console.log('\n✅ Debug complete - check the browser network tab for more details');
	} catch (error) {
		console.error('❌ Debug failed:', error);
	}
}

debugLeaderboardAccess().catch(console.error);
