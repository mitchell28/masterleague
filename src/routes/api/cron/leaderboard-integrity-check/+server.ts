import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { predictions, leagueTable, fixtures } from '$lib/server/db/schema.js';
import { organization } from '$lib/server/db/auth/auth-schema.js';
import { eq, and, sum, sql } from 'drizzle-orm';
import { recalculateLeaderboard } from '$lib/server/football/leaderboard.js';
import type { RequestHandler } from './$types.js';

interface IntegrityCheckResult {
	success: boolean;
	organizationsChecked: number;
	usersChecked: number;
	mismatches: Array<{
		userId: string;
		organizationId: string;
		expectedPoints: number;
		actualPoints: number;
		difference: number;
	}>;
	autoFixed: boolean;
	fixedCount: number;
	executionTime: number;
	message: string;
}

/**
 * POST /api/cron/leaderboard-integrity-check
 *
 * Verifies that leaderboard points match the sum of prediction points.
 * This catches any drift between the two sources of truth.
 *
 * The predictions.points column is the source of truth (calculated with multipliers).
 * The leagueTable.totalPoints should always equal the sum of predictions.points.
 */
export const POST: RequestHandler = async ({ request }) => {
	const startTime = Date.now();

	try {
		const { autoFix = true, threshold = 0 } = await request.json().catch(() => ({}));

		console.log('🔍 Running leaderboard integrity check...');

		// Get all organizations
		const organizations = await db.select().from(organization);

		const mismatches: IntegrityCheckResult['mismatches'] = [];
		let usersChecked = 0;

		for (const org of organizations) {
			// Get expected points from predictions (source of truth)
			const expectedPointsByUser = await db
				.select({
					userId: predictions.userId,
					totalPoints: sum(predictions.points)
				})
				.from(predictions)
				.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
				.where(
					and(
						eq(predictions.organizationId, org.id),
						eq(fixtures.season, '2025-26'),
						eq(fixtures.status, 'FINISHED')
					)
				)
				.groupBy(predictions.userId);

			// Get actual points from leaderboard
			const leaderboardEntries = await db
				.select({
					userId: leagueTable.userId,
					totalPoints: leagueTable.totalPoints
				})
				.from(leagueTable)
				.where(and(eq(leagueTable.organizationId, org.id), eq(leagueTable.season, '2025-26')));

			// Create lookup map for leaderboard
			const leaderboardMap = new Map(leaderboardEntries.map((e) => [e.userId, e.totalPoints]));

			// Compare each user
			for (const expected of expectedPointsByUser) {
				usersChecked++;
				const expectedPoints = Number(expected.totalPoints) || 0;
				const actualPoints = leaderboardMap.get(expected.userId) || 0;
				const difference = Math.abs(expectedPoints - actualPoints);

				if (difference > threshold) {
					mismatches.push({
						userId: expected.userId,
						organizationId: org.id,
						expectedPoints,
						actualPoints,
						difference
					});
				}
			}

			// Also check for users in leaderboard but not in predictions (ghost entries)
			for (const entry of leaderboardEntries) {
				const hasExpected = expectedPointsByUser.some((e) => e.userId === entry.userId);
				if (!hasExpected && entry.totalPoints > 0) {
					mismatches.push({
						userId: entry.userId,
						organizationId: org.id,
						expectedPoints: 0,
						actualPoints: entry.totalPoints,
						difference: entry.totalPoints
					});
				}
			}
		}

		let fixedCount = 0;

		// Auto-fix if enabled and there are mismatches
		if (autoFix && mismatches.length > 0) {
			console.log(`⚠️ Found ${mismatches.length} mismatches - auto-fixing...`);

			// Get unique organizations that need fixing
			const orgsToFix = [...new Set(mismatches.map((m) => m.organizationId))];

			for (const orgId of orgsToFix) {
				try {
					await recalculateLeaderboard(orgId, '2025-26', true); // Force recalculation
					fixedCount++;
					console.log(`✅ Recalculated leaderboard for org ${orgId}`);
				} catch (error) {
					console.error(`❌ Failed to recalculate leaderboard for org ${orgId}:`, error);
				}
			}
		}

		const executionTime = Date.now() - startTime;

		const result: IntegrityCheckResult = {
			success: true,
			organizationsChecked: organizations.length,
			usersChecked,
			mismatches,
			autoFixed: autoFix && mismatches.length > 0,
			fixedCount,
			executionTime,
			message:
				mismatches.length === 0
					? '✅ All leaderboard points match prediction totals'
					: autoFix
						? `⚠️ Found ${mismatches.length} mismatches, auto-fixed ${fixedCount} organizations`
						: `⚠️ Found ${mismatches.length} mismatches (auto-fix disabled)`
		};

		console.log(`🔍 Integrity check complete: ${result.message}`);

		return json(result);
	} catch (error) {
		console.error('Leaderboard integrity check error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
};

/**
 * GET /api/cron/leaderboard-integrity-check
 * Quick check without auto-fix (useful for monitoring)
 */
export const GET: RequestHandler = async () => {
	const startTime = Date.now();

	try {
		// Quick check - just count mismatches
		const organizations = await db.select().from(organization);
		let totalMismatches = 0;

		for (const org of organizations) {
			// Use a single query to find mismatches
			const mismatchCheck = await db.execute(sql`
				SELECT COUNT(*) as mismatch_count FROM (
					SELECT 
						p.user_id,
						COALESCE(SUM(p.points), 0) as expected_points,
						COALESCE(lt.total_points, 0) as actual_points
					FROM predictions p
					INNER JOIN fixtures f ON p.fixture_id = f.id
					LEFT JOIN league_table lt ON p.user_id = lt.user_id 
						AND lt.organization_id = ${org.id}
						AND lt.season = '2025-26'
					WHERE p.organization_id = ${org.id}
						AND f.season = '2025-26'
						AND f.status = 'FINISHED'
					GROUP BY p.user_id, lt.total_points
					HAVING COALESCE(SUM(p.points), 0) != COALESCE(lt.total_points, 0)
				) as mismatches
			`);

			totalMismatches += Number((mismatchCheck as any)[0]?.mismatch_count || 0);
		}

		return json({
			success: true,
			healthy: totalMismatches === 0,
			mismatches: totalMismatches,
			executionTime: Date.now() - startTime,
			message:
				totalMismatches === 0
					? '✅ Leaderboard integrity OK'
					: `⚠️ ${totalMismatches} point mismatches detected`
		});
	} catch (error) {
		console.error('Leaderboard integrity check error:', error);
		return json(
			{
				success: false,
				healthy: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
