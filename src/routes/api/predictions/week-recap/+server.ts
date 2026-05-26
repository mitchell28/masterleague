import { db } from '$lib/server/db';
import { fixtures, predictions } from '$lib/server/db/schema';
import { organization } from '$lib/server/db/auth/auth-schema';
import { eq, and, sum, count, sql } from 'drizzle-orm';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CURRENT_SEASON } from '$lib/server/config/season';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user?.id) throw error(401, 'Unauthenticated');

	const weekParam = url.searchParams.get('week');
	if (!weekParam) throw error(400, 'Missing week param');

	const weekId = parseInt(weekParam, 10);
	if (isNaN(weekId)) throw error(400, 'Invalid week param');

	const [org] = await db
		.select({ id: organization.id })
		.from(organization)
		.where(eq(organization.slug, 'master-league'))
		.limit(1);

	if (!org) throw error(500, 'Organisation not found');

	// Check if all fixtures in this week are finished
	const [weekFixtureSummary] = await db
		.select({
			total: count(fixtures.id),
			finished: sql<number>`COUNT(CASE WHEN ${fixtures.status} = 'FINISHED' THEN 1 END)`.mapWith(
				Number
			)
		})
		.from(fixtures)
		.where(and(eq(fixtures.weekId, weekId), eq(fixtures.season, CURRENT_SEASON)));

	if (
		!weekFixtureSummary ||
		weekFixtureSummary.total === 0 ||
		weekFixtureSummary.finished < weekFixtureSummary.total
	) {
		return json({ available: false });
	}

	// Get prediction stats for this user in this week
	const [recap] = await db
		.select({
			totalPoints: sum(predictions.points).mapWith(Number),
			totalPredictions: count(predictions.id),
			correctScorelines:
				sql<number>`COUNT(CASE WHEN ${predictions.predictedHomeScore} = ${fixtures.homeScore} AND ${predictions.predictedAwayScore} = ${fixtures.awayScore} THEN 1 END)`.mapWith(
					Number
				),
			correctOutcomes: sql<number>`COUNT(CASE WHEN ${predictions.points} > 0 THEN 1 END)`.mapWith(
				Number
			)
		})
		.from(predictions)
		.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
		.where(
			and(
				eq(predictions.userId, locals.user.id),
				eq(predictions.organizationId, org.id),
				eq(fixtures.weekId, weekId),
				eq(fixtures.season, CURRENT_SEASON)
			)
		);

	if (!recap || recap.totalPredictions === 0) {
		return json({ available: false });
	}

	return json({
		available: true,
		weekId,
		totalPoints: recap.totalPoints ?? 0,
		totalPredictions: recap.totalPredictions ?? 0,
		correctScorelines: recap.correctScorelines ?? 0,
		correctOutcomes: recap.correctOutcomes ?? 0
	});
};
