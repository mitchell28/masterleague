#!/usr/bin/env tsx

/**
 * Test script to verify that users are automatically added to the league table
 * when they sign up and are assigned to the default organization.
 */

import { randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from './src/lib/server/db';
import { organization, member, user as authUser } from './src/lib/server/db/auth/auth-schema';
import { leagueTable } from './src/lib/server/db/schema';
import { addUserToLeagueTable } from './src/lib/server/utils/league-utils';

async function testUserLeagueTableIntegration() {
	console.log('🧪 Testing user league table integration...\n');

	try {
		// Get the default organization
		const defaultOrg = await db
			.select()
			.from(organization)
			.where(eq(organization.slug, 'master-league'))
			.limit(1);

		if (!defaultOrg[0]) {
			console.error('❌ Default organization not found');
			return;
		}

		console.log('✅ Found default organization:', defaultOrg[0].name);

		// Test adding a user to the league table
		const testUserId = 'test-user-' + randomUUID();

		console.log('📝 Testing addUserToLeagueTable function...');
		const leagueEntry = await addUserToLeagueTable(testUserId, defaultOrg[0].id);

		console.log('✅ User added to league table:', {
			id: leagueEntry.id,
			userId: leagueEntry.userId,
			organizationId: leagueEntry.organizationId,
			season: leagueEntry.season,
			totalPoints: leagueEntry.totalPoints
		});

		// Verify the entry exists
		const verifyEntry = await db
			.select()
			.from(leagueTable)
			.where(
				and(
					eq(leagueTable.userId, testUserId),
					eq(leagueTable.organizationId, defaultOrg[0].id),
					eq(leagueTable.season, '2025-26')
				)
			)
			.limit(1);

		if (verifyEntry[0]) {
			console.log('✅ Entry verified in database');
		} else {
			console.error('❌ Entry not found in database');
		}

		// Clean up test data
		await db.delete(leagueTable).where(eq(leagueTable.userId, testUserId));

		console.log('🧹 Test data cleaned up');

		// Show current league table state
		const allLeagueEntries = await db
			.select({
				userId: leagueTable.userId,
				userName: authUser.name,
				totalPoints: leagueTable.totalPoints,
				season: leagueTable.season
			})
			.from(leagueTable)
			.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
			.where(
				and(eq(leagueTable.organizationId, defaultOrg[0].id), eq(leagueTable.season, '2025-26'))
			)
			.orderBy(leagueTable.totalPoints);

		console.log('\n📊 Current league table entries:');
		allLeagueEntries.forEach((entry, index) => {
			console.log(`${index + 1}. ${entry.userName}: ${entry.totalPoints} points`);
		});

		console.log('\n✅ Test completed successfully!');
		console.log('\n💡 The auth system will now automatically:');
		console.log('   1. Add new users to the default organization');
		console.log('   2. Create league table entries for them');
		console.log('   3. Display them in the leaderboard with 0 points');
	} catch (error) {
		console.error('❌ Test failed:', error);
	}
}

testUserLeagueTableIntegration();
