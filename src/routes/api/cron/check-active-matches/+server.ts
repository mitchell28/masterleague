import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { fixtures } from '$lib/server/db/schema';
import { and, gte, lte, inArray, or, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/**
 * Intelligent match activity checker
 * Returns detailed info about what needs attention RIGHT NOW
 */
export const GET: RequestHandler = async () => {
	try {
		const now = new Date();
		const currentSeason = '2025-26'; // TODO: Make this dynamic based on current date

		// Time windows for different scenarios
		const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
		const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000); // Extended from 2 hours
		const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60 * 1000);

		// 1. LIVE MATCHES - Currently in play (NOT finished)
		const liveMatches = await db
			.select({
				id: fixtures.id,
				status: fixtures.status,
				matchDate: fixtures.matchDate,
				homeTeamId: fixtures.homeTeamId,
				awayTeamId: fixtures.awayTeamId
			})
			.from(fixtures)
			.where(
				and(
					eq(fixtures.season, currentSeason), // Only current season
					inArray(fixtures.status, ['IN_PLAY', 'PAUSED', 'LIVE']),
					lte(fixtures.matchDate, now) // Must have kicked off already
				)
			)
			.limit(20);

		// 2. MATCHES THAT SHOULD BE LIVE - Scheduled to have started but not marked live yet
		// (Kickoff was between 30 mins ago and now, and NOT finished)
		const shouldBeLive = await db
			.select({
				id: fixtures.id,
				status: fixtures.status,
				matchDate: fixtures.matchDate,
				homeTeamId: fixtures.homeTeamId,
				awayTeamId: fixtures.awayTeamId
			})
			.from(fixtures)
			.where(
				and(
					eq(fixtures.season, currentSeason), // Only current season
					inArray(fixtures.status, ['SCHEDULED', 'TIMED']),
					gte(fixtures.matchDate, thirtyMinsAgo),
					lte(fixtures.matchDate, now)
				)
			)
			.limit(20);

		// 3. MATCHES THAT SHOULD HAVE FINISHED - Scheduled >2.5 hours ago but still not finished
		// (These might be in extra time, penalties, or have delayed finish)
		// Keep checking these until they're actually marked FINISHED
		const shouldBeFinishedMatches = await db
			.select({
				id: fixtures.id,
				status: fixtures.status,
				matchDate: fixtures.matchDate,
				homeTeamId: fixtures.homeTeamId,
				awayTeamId: fixtures.awayTeamId
			})
			.from(fixtures)
			.where(
				and(
					eq(fixtures.season, currentSeason), // Only current season
					inArray(fixtures.status, ['IN_PLAY', 'PAUSED', 'LIVE', 'SCHEDULED', 'TIMED']),
					lte(fixtures.matchDate, new Date(now.getTime() - 2.5 * 60 * 60 * 1000))
				)
			)
			.limit(20);

		// 4. UPCOMING MATCHES - Starting in next 30 minutes (need to start checking soon)
		const upcomingMatches = await db
			.select({
				id: fixtures.id,
				status: fixtures.status,
				matchDate: fixtures.matchDate,
				homeTeamId: fixtures.homeTeamId,
				awayTeamId: fixtures.awayTeamId
			})
			.from(fixtures)
			.where(
				and(
					eq(fixtures.season, currentSeason), // Only current season
					inArray(fixtures.status, ['SCHEDULED', 'TIMED']),
					gte(fixtures.matchDate, now),
					lte(fixtures.matchDate, thirtyMinsFromNow)
				)
			)
			.limit(20);

		// 5. RECENTLY FINISHED - Marked as finished in last 4 hours (extended to catch more issues)
		// Note: We rely on time windows + safety check instead of a separate flag
		// The prediction-safety-check runs every 6 hours and catches any missed processing
		const recentlyFinished = await db
			.select({
				id: fixtures.id,
				status: fixtures.status,
				matchDate: fixtures.matchDate,
				homeTeamId: fixtures.homeTeamId,
				awayTeamId: fixtures.awayTeamId,
				homeScore: fixtures.homeScore,
				awayScore: fixtures.awayScore
			})
			.from(fixtures)
			.where(
				and(
					eq(fixtures.season, currentSeason), // Only current season
					eq(fixtures.status, 'FINISHED'),
					gte(fixtures.matchDate, fourHoursAgo), // Extended from 2 to 4 hours
					lte(fixtures.matchDate, now)
				)
			)
			.limit(20);

		// Determine what actions are needed
		const hasLiveMatches = liveMatches.length > 0 || shouldBeLive.length > 0;
		const hasUpcomingMatches = upcomingMatches.length > 0;
		const hasRecentlyFinished = recentlyFinished.length > 0;
		const needsFinishCheck = shouldBeFinishedMatches.length > 0;

		// Any activity at all?
		const needsProcessing =
			hasLiveMatches || hasUpcomingMatches || hasRecentlyFinished || needsFinishCheck;

		// Log what we found
		if (needsProcessing) {
			console.log('🏟️ Match activity detected:');
			if (liveMatches.length > 0) console.log(`  🔴 ${liveMatches.length} LIVE matches`);
			if (shouldBeLive.length > 0)
				console.log(`  ⚠️ ${shouldBeLive.length} matches should be live (checking...)`);
			if (upcomingMatches.length > 0)
				console.log(`  ⏰ ${upcomingMatches.length} matches starting soon`);
			if (recentlyFinished.length > 0)
				console.log(`  🏁 ${recentlyFinished.length} recently finished (verifying...)`);
			if (shouldBeFinishedMatches.length > 0)
				console.log(
					`  ⏳ ${shouldBeFinishedMatches.length} matches should be finished (checking...)`
				);
		} else {
			console.log('✅ No active matches - all quiet');
		}

		return json({
			needsProcessing,
			hasLiveMatches,
			hasUpcomingMatches,
			hasRecentlyFinished,
			needsFinishCheck,
			counts: {
				live: liveMatches.length,
				shouldBeLive: shouldBeLive.length,
				upcoming: upcomingMatches.length,
				recentlyFinished: recentlyFinished.length,
				shouldBeFinished: shouldBeFinishedMatches.length,
				total:
					liveMatches.length +
					shouldBeLive.length +
					upcomingMatches.length +
					recentlyFinished.length +
					shouldBeFinishedMatches.length
			},
			matches: {
				live: liveMatches.map((m) => ({
					id: m.id,
					status: m.status,
					kickoff: m.matchDate,
					homeTeamId: m.homeTeamId,
					awayTeamId: m.awayTeamId
				})),
				shouldBeLive: shouldBeLive.map((m) => ({
					id: m.id,
					status: m.status,
					kickoff: m.matchDate,
					homeTeamId: m.homeTeamId,
					awayTeamId: m.awayTeamId
				})),
				upcoming: upcomingMatches.map((m) => ({
					id: m.id,
					status: m.status,
					kickoff: m.matchDate,
					homeTeamId: m.homeTeamId,
					awayTeamId: m.awayTeamId
				})),
				recentlyFinished: recentlyFinished.map((m) => ({
					id: m.id,
					status: m.status,
					kickoff: m.matchDate,
					score: `${m.homeScore ?? '?'}-${m.awayScore ?? '?'}`,
					homeTeamId: m.homeTeamId,
					awayTeamId: m.awayTeamId
				})),
				shouldBeFinished: shouldBeFinishedMatches.map((m) => ({
					id: m.id,
					status: m.status,
					kickoff: m.matchDate,
					homeTeamId: m.homeTeamId,
					awayTeamId: m.awayTeamId
				}))
			},
			checkedAt: now.toISOString()
		});
	} catch (error) {
		console.error('❌ Error checking active matches:', error);

		// Return fail-safe response (assume matches exist to avoid missing updates)
		return json({
			needsProcessing: true,
			hasLiveMatches: true,
			hasUpcomingMatches: true,
			hasRecentlyFinished: true,
			needsFinishCheck: true,
			error: 'Failed to check matches',
			failSafe: true
		});
	}
};
