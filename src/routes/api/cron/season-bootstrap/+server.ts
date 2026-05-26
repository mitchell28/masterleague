import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { fixtures, leagueTable } from '$lib/server/db/schema';
import { member, organization } from '$lib/server/db/auth/auth-schema';
import { eq, and, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { CURRENT_SEASON } from '$lib/server/config/season';
import type { RequestHandler } from './$types';

/**
 * POST /api/cron/season-bootstrap
 *
 * Idempotent endpoint that fully provisions a new season:
 *   1. Checks whether CURRENT_SEASON fixtures are already seeded
 *   2. If not, attempts to fetch them from the football-data.org API
 *      (returns {status:'pending'} gracefully when the API 404s - data not published yet)
 *   3. Ensures every org member has a league table row for CURRENT_SEASON
 *
 * Safe to call repeatedly - skips steps that are already done.
 */
export const POST: RequestHandler = async ({ request }) => {
	const { force = false } = await request.json().catch(() => ({}));

	const apiKey = process.env.FOOTBALL_DATA_API_KEY;
	if (!apiKey) {
		return json({ success: false, error: 'FOOTBALL_DATA_API_KEY not set' }, { status: 500 });
	}

	const result: Record<string, unknown> = { season: CURRENT_SEASON };

	// ── 1. Check fixture count ──────────────────────────────────────────────
	const [{ value: fixtureCount }] = await db
		.select({ value: count() })
		.from(fixtures)
		.where(eq(fixtures.season, CURRENT_SEASON));

	result.fixturesAlreadySeeded = fixtureCount;

	if (fixtureCount >= 380 && !force) {
		result.fixturesStatus = 'already_seeded';
	} else {
		// ── 2. Try to seed fixtures from API ───────────────────────────────
		const apiSeason = CURRENT_SEASON.split('-')[0]; // e.g. '2026'
		const MATCHES_URL = `https://api.football-data.org/v4/competitions/PL/matches?season=${apiSeason}`;

		const matchesRes = await fetch(MATCHES_URL, {
			headers: { 'X-Auth-Token': apiKey }
		});

		if (matchesRes.status === 404) {
			result.fixturesStatus = 'pending';
			result.fixturesMessage = `API has no data for season ${apiSeason} yet — will retry automatically`;
		} else if (!matchesRes.ok) {
			result.fixturesStatus = 'api_error';
			result.fixturesMessage = `API returned ${matchesRes.status}: ${matchesRes.statusText}`;
		} else {
			const { matches: apiMatches = [] } = await matchesRes.json();

			if (apiMatches.length === 0) {
				result.fixturesStatus = 'pending';
				result.fixturesMessage = 'API returned 0 matches — schedule not published yet';
			} else {
				// Fetch team mapping
				const TEAMS_URL = `https://api.football-data.org/v4/competitions/PL/teams?season=${apiSeason}`;
				const teamsRes = await fetch(TEAMS_URL, { headers: { 'X-Auth-Token': apiKey } });
				const { teams: apiTeams = [] } = teamsRes.ok ? await teamsRes.json() : {};

				const dbTeams = await db.query.teams.findMany();
				const teamMap: Record<number, string> = {};

				for (const apiTeam of apiTeams) {
					const tla = apiTeam.tla?.toLowerCase();
					const matched = dbTeams.find(
						(t) =>
							t.shortName.toLowerCase() === tla ||
							t.name.toLowerCase() === apiTeam.name?.toLowerCase()
					);
					if (matched) teamMap[apiTeam.id] = matched.id;
				}

				// Group by matchday and upsert
				const byWeek: Record<number, typeof apiMatches> = {};
				for (const m of apiMatches) {
					if (!byWeek[m.matchday]) byWeek[m.matchday] = [];
					byWeek[m.matchday].push(m);
				}

				let inserted = 0;
				for (const [weekIdStr, weekMatches] of Object.entries(byWeek)) {
					const weekId = parseInt(weekIdStr);

					// Clear existing fixtures for this week/season to stay idempotent
					const existingWeek = await db
						.select({ id: fixtures.id })
						.from(fixtures)
						.where(and(eq(fixtures.weekId, weekId), eq(fixtures.season, CURRENT_SEASON)));

					if (existingWeek.length > 0 && !force) continue;

					if (existingWeek.length > 0) {
						await db
							.delete(fixtures)
							.where(and(eq(fixtures.weekId, weekId), eq(fixtures.season, CURRENT_SEASON)));
					}

					const rows = weekMatches
						.map((m: any) => {
							const homeTeamId = teamMap[m.homeTeam?.id];
							const awayTeamId = teamMap[m.awayTeam?.id];
							if (!homeTeamId || !awayTeamId) return null;

							const status =
								m.status === 'FINISHED'
									? 'FINISHED'
									: ['IN_PLAY', 'PAUSED', 'SUSPENDED'].includes(m.status)
										? 'IN_PLAY'
										: 'SCHEDULED';

							return {
								id: randomUUID(),
								matchId: String(m.id),
								weekId,
								season: CURRENT_SEASON,
								homeTeamId,
								awayTeamId,
								homeScore: m.score?.fullTime?.home ?? null,
								awayScore: m.score?.fullTime?.away ?? null,
								matchDate: new Date(m.utcDate),
								pointsMultiplier: 1,
								status
							};
						})
						.filter(Boolean);

					if (rows.length > 0) {
						await db.insert(fixtures).values(rows as any);
						inserted += rows.length;
					}
				}

				result.fixturesStatus = 'seeded';
				result.fixturesInserted = inserted;
			}
		}
	}

	// ── 3. Ensure league table entries exist for all org members ───────────
	const orgs = await db.select().from(organization);
	let ltCreated = 0;
	let ltSkipped = 0;

	for (const org of orgs) {
		const members = await db.select().from(member).where(eq(member.organizationId, org.id));

		for (const m of members) {
			const [existing] = await db
				.select({ id: leagueTable.id })
				.from(leagueTable)
				.where(
					and(
						eq(leagueTable.userId, m.userId),
						eq(leagueTable.organizationId, org.id),
						eq(leagueTable.season, CURRENT_SEASON)
					)
				)
				.limit(1);

			if (existing) {
				ltSkipped++;
				continue;
			}

			await db.insert(leagueTable).values({
				id: randomUUID(),
				userId: m.userId,
				organizationId: org.id,
				season: CURRENT_SEASON,
				totalPoints: 0,
				correctScorelines: 0,
				correctOutcomes: 0,
				predictedFixtures: 0,
				completedFixtures: 0,
				lastUpdated: new Date()
			});
			ltCreated++;
		}
	}

	result.leagueTableCreated = ltCreated;
	result.leagueTableSkipped = ltSkipped;
	result.success = true;
	result.timestamp = new Date().toISOString();

	return json(result);
};

/**
 * GET /api/cron/season-bootstrap
 * Read-only status check — how many fixtures are seeded for CURRENT_SEASON.
 */
export const GET: RequestHandler = async () => {
	const [{ value: fixtureCount }] = await db
		.select({ value: count() })
		.from(fixtures)
		.where(eq(fixtures.season, CURRENT_SEASON));

	const orgs = await db.select().from(organization);
	let membersWithoutEntry = 0;

	for (const org of orgs) {
		const members = await db.select().from(member).where(eq(member.organizationId, org.id));

		for (const m of members) {
			const [existing] = await db
				.select({ id: leagueTable.id })
				.from(leagueTable)
				.where(
					and(
						eq(leagueTable.userId, m.userId),
						eq(leagueTable.organizationId, org.id),
						eq(leagueTable.season, CURRENT_SEASON)
					)
				)
				.limit(1);

			if (!existing) membersWithoutEntry++;
		}
	}

	return json({
		season: CURRENT_SEASON,
		fixturesSeeded: fixtureCount,
		fixturesComplete: fixtureCount >= 380,
		membersWithoutLeagueEntry: membersWithoutEntry,
		ready: fixtureCount >= 380 && membersWithoutEntry === 0
	});
};
