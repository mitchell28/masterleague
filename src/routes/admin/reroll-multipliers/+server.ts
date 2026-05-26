import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { fixtures, teams } from '$lib/server/db/schema';
import { setRandomMultipliersForWeek } from '$lib/server/engine/data/fixtures/fixtureRepository';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

const homeTeam = alias(teams, 'homeTeam');
const awayTeam = alias(teams, 'awayTeam');

async function getWeekFixtures(week: number) {
	return db
		.select({
			id: fixtures.id,
			homeTeam: homeTeam.shortName,
			awayTeam: awayTeam.shortName,
			matchDate: fixtures.matchDate,
			status: fixtures.status,
			pointsMultiplier: fixtures.pointsMultiplier
		})
		.from(fixtures)
		.innerJoin(homeTeam, eq(fixtures.homeTeamId, homeTeam.id))
		.innerJoin(awayTeam, eq(fixtures.awayTeamId, awayTeam.id))
		.where(eq(fixtures.weekId, week))
		.orderBy(fixtures.matchDate);
}

function canReroll(weekFixtures: { matchDate: Date; status: string }[]): boolean {
	if (weekFixtures.length === 0) return false;
	const now = new Date();
	return weekFixtures.every(
		(f) => f.matchDate > now && (f.status === 'TIMED' || f.status === 'SCHEDULED')
	);
}

/** GET /admin/reroll-multipliers?week=N — current fixture multipliers for a given week */
export const GET: RequestHandler = async ({ locals, url }) => {
	if (locals.user?.role !== 'admin') {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	const weekParam = url.searchParams.get('week');
	if (!weekParam) return json({ error: 'week param required' }, { status: 400 });

	const week = parseInt(weekParam);
	if (isNaN(week) || week < 1 || week > 38) {
		return json({ error: 'Invalid week' }, { status: 400 });
	}

	const weekFixtures = await getWeekFixtures(week);
	const earliest =
		weekFixtures.length > 0
			? weekFixtures.reduce(
					(m, f) => (f.matchDate < m ? f.matchDate : m),
					weekFixtures[0].matchDate
				)
			: null;

	return json({
		fixtures: weekFixtures,
		canReroll: canReroll(weekFixtures),
		earliestKickoff: earliest
	});
};

/** POST /admin/reroll-multipliers — re-randomise 2× / 3× for a week (blocked once it has started) */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (locals.user?.role !== 'admin') {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	const body = await request.json();
	const week = parseInt(body.week);
	if (!week || isNaN(week) || week < 1 || week > 38) {
		return json({ success: false, message: 'Invalid week number' }, { status: 400 });
	}

	const weekFixtures = await getWeekFixtures(week);

	if (weekFixtures.length === 0) {
		return json({ success: false, message: `No fixtures found for week ${week}` }, { status: 404 });
	}

	// Hard server-side guard — cannot change multipliers once any fixture has kicked off
	if (!canReroll(weekFixtures)) {
		return json(
			{
				success: false,
				message: `Week ${week} has already kicked off — multipliers are locked`
			},
			{ status: 403 }
		);
	}

	await setRandomMultipliersForWeek(week);

	const updated = await getWeekFixtures(week);
	const triple = updated.find((f) => f.pointsMultiplier === 3);
	const double = updated.find((f) => f.pointsMultiplier === 2);

	return json({
		success: true,
		message: `Multipliers re-rolled for week ${week}`,
		triple,
		double,
		fixtures: updated
	});
};
