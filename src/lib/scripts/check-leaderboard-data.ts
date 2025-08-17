#!/usr/bin/env tsx

import { db } from '../server/db/index.js';
import { leagueTable } from '../server/db/schema.js';
import { user as authUser, organization } from '../server/db/auth/auth-schema.js';
import { eq, and, desc } from 'drizzle-orm';

async function checkLeaderboardData() {
	try {
		console.log('🔍 Checking leaderboard data...');

		// Check organizations
		const organizations = await db.select().from(organization).limit(5);
		console.log('\n📊 Organizations:', organizations.length);
		for (const org of organizations) {
			console.log(`  - ${org.name} (${org.id})`);
		}

		// Check league table data
		const season = '2025-26';
		const leagueData = await db
			.select({
				organizationId: leagueTable.organizationId,
				userId: leagueTable.userId,
				userName: authUser.name,
				totalPoints: leagueTable.totalPoints,
				season: leagueTable.season
			})
			.from(leagueTable)
			.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
			.where(eq(leagueTable.season, season))
			.limit(10);

		console.log(`\n🏆 League table entries for season ${season}:`, leagueData.length);
		for (const entry of leagueData) {
			console.log(`  - ${entry.userName} (${entry.organizationId}): ${entry.totalPoints} points`);
		}

		// Check specific organization
		if (organizations.length > 0) {
			const firstOrg = organizations[0];
			const orgLeaderboard = await db
				.select({
					userId: leagueTable.userId,
					userName: authUser.name,
					totalPoints: leagueTable.totalPoints
				})
				.from(leagueTable)
				.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
				.where(and(eq(leagueTable.organizationId, firstOrg.id), eq(leagueTable.season, season)))
				.orderBy(desc(leagueTable.totalPoints));

			console.log(`\n🥇 Leaderboard for ${firstOrg.name}:`, orgLeaderboard.length);
			for (const entry of orgLeaderboard) {
				console.log(`  - ${entry.userName}: ${entry.totalPoints} points`);
			}
		}

		console.log('\n✅ Database check complete');
	} catch (error) {
		console.error('❌ Error checking leaderboard data:', error);
	}

	process.exit(0);
}

checkLeaderboardData();
