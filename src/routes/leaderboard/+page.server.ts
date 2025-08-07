import { db } from '$lib/server/db';
import { leagueTable, authUser, member, organization } from '../../../drizzle/schema';
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

	// Get user's organizations
	const userOrganizations = await db
		.select({
			id: organization.id,
			name: organization.name,
			slug: organization.slug
		})
		.from(member)
		.innerJoin(organization, eq(member.organizationId, organization.id))
		.where(eq(member.userId, locals.user.id));

	// Get selected organization from URL parameter, default to first organization
	const selectedOrganizationId = url.searchParams.get('organization') || userOrganizations[0]?.id;

	if (!selectedOrganizationId || userOrganizations.length === 0) {
		return {
			currentWeek: await getCurrentWeek(),
			leaderboard: [],
			userOrganizations: [],
			selectedOrganization: null,
			user: locals.user,
			currentSeason: '2025-26'
		};
	}

	// Find the selected organization
	const selectedOrganization =
		userOrganizations.find((org) => org.id === selectedOrganizationId) || userOrganizations[0];

	// Get the leaderboard data for the selected organization and 2025-26 season
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
			organizationId: leagueTable.organizationId
		})
		.from(leagueTable)
		.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
		.where(
			and(eq(leagueTable.season, '2025-26'), eq(leagueTable.organizationId, selectedOrganizationId))
		)
		.orderBy(desc(leagueTable.totalPoints), desc(leagueTable.completedFixtures));

	const currentWeek = await getCurrentWeek();

	return {
		currentWeek,
		leaderboard,
		userOrganizations,
		selectedOrganization,
		user: locals.user,
		currentSeason: '2025-26'
	};
}) satisfies PageServerLoad;
