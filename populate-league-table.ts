import { db } from './src/lib/server/db';
import { user as authUser, member, organization } from './src/lib/server/db/auth/auth-schema';
import { leagueTable } from './src/lib/server/db/schema';
import { randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';

async function populateLeagueTable() {
	console.log('🔧 Populating league table with organization members...');

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

	const org = defaultOrg[0];
	console.log('✅ Found organization:', org.name);

	// Get all members of the organization
	const members = await db
		.select({
			userId: member.userId,
			userName: authUser.name,
			userEmail: authUser.email
		})
		.from(member)
		.innerJoin(authUser, eq(member.userId, authUser.id))
		.where(eq(member.organizationId, org.id));

	console.log('✅ Found organization members:', members.length);

	// Check existing league table entries
	const existingEntries = await db
		.select()
		.from(leagueTable)
		.where(and(eq(leagueTable.organizationId, org.id), eq(leagueTable.season, '2025-26')));

	console.log('✅ Existing league entries:', existingEntries.length);

	// Create league table entries for members who don't have them
	const newEntries = [];
	for (const member of members) {
		const hasEntry = existingEntries.some((entry) => entry.userId === member.userId);
		if (!hasEntry) {
			newEntries.push({
				id: randomUUID(),
				userId: member.userId,
				organizationId: org.id,
				season: '2025-26',
				totalPoints: 0,
				correctScorelines: 0,
				correctOutcomes: 0,
				predictedFixtures: 0,
				completedFixtures: 0,
				lastUpdated: new Date()
			});
		}
	}

	if (newEntries.length > 0) {
		console.log('Creating', newEntries.length, 'new league table entries...');
		await db.insert(leagueTable).values(newEntries);
		console.log('✅ League table entries created!');

		newEntries.forEach((entry) => {
			const memberName = members.find((m) => m.userId === entry.userId)?.userName || 'Unknown';
			console.log(`  - ${memberName}: ${entry.totalPoints} points`);
		});
	} else {
		console.log('ℹ️  All members already have league table entries');
	}

	// Show final league table state
	const finalEntries = await db
		.select({
			userId: leagueTable.userId,
			userName: authUser.name,
			totalPoints: leagueTable.totalPoints,
			season: leagueTable.season
		})
		.from(leagueTable)
		.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
		.where(and(eq(leagueTable.organizationId, org.id), eq(leagueTable.season, '2025-26')));

	console.log('\n📊 Final league table state:');
	finalEntries.forEach((entry, index) => {
		console.log(`  ${index + 1}. ${entry.userName}: ${entry.totalPoints} points`);
	});

	console.log('\n✅ League table population complete!');
	process.exit(0);
}

populateLeagueTable().catch(console.error);
