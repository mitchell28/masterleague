import { db } from '$lib/server/db';
import { leagueTable, authUser, groupMemberships, groups } from '../../../drizzle/schema';
import { desc, eq, and, inArray } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { processRecentFixtures } from '$lib/scripts/recalculate-points-api';
import { getCurrentWeek } from '$lib/server/football/fixtures';

export const load = (async ({ locals, url }) => {
	console.log('🔍 Leaderboard load function called');
	console.log('   Locals user:', locals.user ? `${locals.user.name} (${locals.user.id})` : 'null');
	console.log('   Locals session:', locals.session ? 'exists' : 'null');
	console.log('   User ID from locals.user:', locals.user?.id || 'null');

	if (!locals.user?.id) {
		console.log('❌ No user ID found, redirecting to auth');
		redirect(302, '/auth/otp?redirectTo=/leaderboard');
	} // Process recent fixtures and await the result to ensure points are calculated
	try {
		const result = await processRecentFixtures();
		if (result.processedPredictions > 0) {
			console.log(
				`Processed ${result.processedFixtures} fixtures and ${result.processedPredictions} predictions`
			);
		}
	} catch (err) {
		console.error('Points calculation error:', err);
	}

	// Get user's groups
	const userGroups = await db
		.select({
			id: groups.id,
			name: groups.name,
			description: groups.description
		})
		.from(groupMemberships)
		.innerJoin(groups, eq(groupMemberships.groupId, groups.id))
		.where(and(eq(groupMemberships.userId, locals.user.id), eq(groupMemberships.isActive, true)));

	// Get selected group from URL parameter, default to first group
	const selectedGroupId = url.searchParams.get('group') || userGroups[0]?.id;

	if (!selectedGroupId || userGroups.length === 0) {
		return {
			currentWeek: await getCurrentWeek(),
			leaderboard: [],
			userGroups: [],
			selectedGroup: null,
			user: locals.user,
			currentSeason: '2025-26'
		};
	}

	// Find the selected group
	const selectedGroup = userGroups.find((g) => g.id === selectedGroupId) || userGroups[0];

	// Get the leaderboard data for the selected group and 2025-26 season
	const leaderboard = await db
		.select({
			id: leagueTable.userId,
			username: authUser.name,
			email: authUser.email,
			totalPoints: leagueTable.totalPoints,
			correctScorelines: leagueTable.correctScorelines,
			correctOutcomes: leagueTable.correctOutcomes,
			predictedFixtures: leagueTable.predictedFixtures,
			completedFixtures: leagueTable.completedFixtures,
			lastUpdated: leagueTable.lastUpdated,
			season: leagueTable.season,
			groupId: leagueTable.groupId
		})
		.from(leagueTable)
		.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
		.where(and(eq(leagueTable.season, '2025-26'), eq(leagueTable.groupId, selectedGroupId)))
		.orderBy(desc(leagueTable.totalPoints), desc(leagueTable.completedFixtures));

	const currentWeek = await getCurrentWeek();

	return {
		currentWeek,
		leaderboard,
		userGroups,
		selectedGroup,
		user: locals.user,
		currentSeason: '2025-26'
	};
}) satisfies PageServerLoad;
