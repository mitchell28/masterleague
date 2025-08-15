import { db } from '$lib/server/db';
import { user as authUser, organization } from '$lib/server/db/auth/auth-schema';
import { leagueTable } from '$lib/server/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';
import { getCurrentWeek } from '$lib/server/football/fixtures';

export const load = (async ({ locals, url }) => {
	if (!locals.user?.id) {
		throw redirect(302, '/auth/login');
	}

	// Check if email is verified
	if (!locals.user.emailVerified) {
		throw redirect(302, '/auth/verify-email');
	}

	// Get the default organization
	const defaultOrganization = await db
		.select()
		.from(organization)
		.where(eq(organization.slug, 'master-league'))
		.limit(1);

	if (!defaultOrganization[0]) {
		return {
			currentWeek: await getCurrentWeek(),
			leaderboard: [],
			selectedOrganization: null,
			user: locals.user,
			currentSeason: '2025-26'
		};
	}

	const selectedOrganization = defaultOrganization[0];

	// Get leaderboard from league table
	const leaderboard = await db
		.select({
			id: leagueTable.userId,
			name: authUser.name,
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
			and(
				eq(leagueTable.season, '2025-26'),
				eq(leagueTable.organizationId, selectedOrganization.id)
			)
		)
		.orderBy(desc(leagueTable.totalPoints), desc(leagueTable.correctScorelines), authUser.name);

	const currentWeek = await getCurrentWeek();

	// Meta tags for SEO
	const pageMetaTags = Object.freeze({
		title: 'Leaderboard',
		description:
			'View the current leaderboard standings and see how you rank against other players in your prediction groups.',
		canonical: new URL(url.pathname, url.origin).href,
		openGraph: {
			title: 'Leaderboard - Master League',
			description:
				'View the current leaderboard standings and see how you rank against other players in your prediction groups.',
			url: new URL(url.pathname, url.origin).href
		},
		twitter: {
			title: 'Leaderboard - Master League',
			description:
				'View the current leaderboard standings and see how you rank against other players in your prediction groups.'
		}
	}) satisfies MetaTagsProps;

	return {
		currentWeek,
		leaderboard,
		selectedOrganization,
		currentSeason: '2025-26',
		pageMetaTags
	};
}) satisfies PageServerLoad;
