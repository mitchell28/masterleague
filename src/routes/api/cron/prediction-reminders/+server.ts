import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, member } from '$lib/server/db';
import { fixtures, predictions } from '$lib/server/db/schema';
import { user as authUser } from '$lib/server/db/auth/auth-schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { getCurrentWeek } from '$lib/server/engine/data/fixtures';
import { Resend } from 'resend';
import { getEnvVar } from '$lib/server/utils/env';

const resend = new Resend(getEnvVar('RESEND_API_KEY'));

// Dynamic imports to avoid build-time module resolution issues
async function renderPredictionEmail(props: {
	userName: string;
	week: number;
	missingCount: number;
	totalFixtures: number;
	firstKickoff: string;
}) {
	const Renderer = (await import('better-svelte-email/render')).default;
	const { toPlainText } = await import('better-svelte-email/render');
	const PredictionReminderEmail = (await import('$lib/emails/prediction-reminder.svelte')).default;

	const { render } = new Renderer();
	const html = await render(PredictionReminderEmail, { props });
	const plainText = toPlainText(html);

	return { html, plainText };
}

interface UserWithMissingPredictions {
	userId: string;
	email: string;
	name: string;
	organizationId: string;
	predictedCount: number;
	missingCount: number;
}

/**
 * Get users who have missing predictions for the current week
 */
async function getUsersWithMissingPredictions(
	weekId: number,
	season: string = '2025-26'
): Promise<UserWithMissingPredictions[]> {
	// Get all fixtures for this week
	const weekFixtures = await db
		.select({ id: fixtures.id })
		.from(fixtures)
		.where(and(eq(fixtures.weekId, weekId), eq(fixtures.season, season)));

	const totalFixtures = weekFixtures.length;

	if (totalFixtures === 0) {
		console.log(`No fixtures found for week ${weekId}`);
		return [];
	}

	const fixtureIds = weekFixtures.map((f) => f.id);

	// Get all verified users who are members of an organization
	// and count their predictions for this week's fixtures
	const usersWithPredictions = await db
		.select({
			userId: member.userId,
			email: authUser.email,
			name: authUser.name,
			organizationId: member.organizationId,
			predictedCount: sql<number>`
				COALESCE(
					(SELECT COUNT(*) 
					 FROM predictions p 
					 WHERE p.user_id = ${member.userId} 
					 AND p.organization_id = ${member.organizationId}
					 AND p.fixture_id IN (${sql.join(
							fixtureIds.map((id) => sql`${id}`),
							sql`, `
						)})
					), 0
				)::int
			`
		})
		.from(member)
		.innerJoin(authUser, eq(member.userId, authUser.id))
		.where(eq(authUser.emailVerified, true));

	// Filter to users with missing predictions
	return usersWithPredictions
		.filter((u) => u.predictedCount < totalFixtures)
		.map((u) => ({
			...u,
			missingCount: totalFixtures - u.predictedCount
		}));
}

/**
 * Get upcoming fixtures for a week that haven't started yet
 */
async function getUpcomingFixturesForWeek(weekId: number, season: string = '2025-26') {
	const now = new Date();

	const upcomingFixtures = await db
		.select({
			id: fixtures.id,
			homeTeamId: fixtures.homeTeamId,
			awayTeamId: fixtures.awayTeamId,
			matchDate: fixtures.matchDate,
			status: fixtures.status
		})
		.from(fixtures)
		.where(
			and(
				eq(fixtures.weekId, weekId),
				eq(fixtures.season, season),
				inArray(fixtures.status, ['SCHEDULED', 'TIMED'])
			)
		)
		.orderBy(fixtures.matchDate);

	// Filter to only fixtures that haven't started
	return upcomingFixtures.filter((f) => new Date(f.matchDate) > now);
}

export const POST: RequestHandler = async ({ request }) => {
	const startTime = Date.now();

	try {
		const body = await request.json().catch(() => ({}));
		const force = body.force === true;
		const dryRun = body.dryRun === true;

		console.log('📧 Starting prediction reminder job...', { force, dryRun });

		// Get current week
		const currentWeek = await getCurrentWeek();
		console.log(`📅 Current week: ${currentWeek}`);

		// Get upcoming fixtures for this week
		const upcomingFixtures = await getUpcomingFixturesForWeek(currentWeek);

		if (upcomingFixtures.length === 0 && !force) {
			console.log('⏭️ No upcoming fixtures - skipping reminders');
			return json({
				success: true,
				skipped: true,
				reason: 'no-upcoming-fixtures',
				week: currentWeek
			});
		}

		// Check if the week has already started (i.e. the first upcoming fixture is NOT the first fixture of the week)
		// We only want to send reminders before the FIRST game of the week.
		// We look at ALL fixtures for the week (including finished ones) to find the true start of the week.
		const firstFixtureOfWeek = await db
			.select({ id: fixtures.id, matchDate: fixtures.matchDate })
			.from(fixtures)
			.where(and(eq(fixtures.weekId, currentWeek), eq(fixtures.season, '2025-26')))
			.orderBy(fixtures.matchDate)
			.limit(1)
			.then((rows) => rows[0]);

		// Use timestamp comparison to handle multiple fixtures starting at the same time
		if (
			firstFixtureOfWeek &&
			new Date(upcomingFixtures[0].matchDate).getTime() >
				new Date(firstFixtureOfWeek.matchDate).getTime() &&
			!force
		) {
			console.log('⏭️ Week has already started (first fixture passed) - skipping reminders');
			return json({
				success: true,
				skipped: true,
				reason: 'week-already-started',
				week: currentWeek
			});
		}

		// Get first kickoff time
		const firstFixture = upcomingFixtures[0];
		const firstKickoffDate = new Date(firstFixture.matchDate);
		const now = new Date();
		const diffInHours = (firstKickoffDate.getTime() - now.getTime()) / (1000 * 60 * 60);

		console.log(
			`First kickoff: ${firstKickoffDate.toISOString()}, Diff: ${diffInHours.toFixed(2)} hours`
		);

		if (!force) {
			// Check if we are in the 5 hour window (4.5 to 5.5 hours)
			// This assumes the cron runs hourly
			if (diffInHours < 4.5 || diffInHours >= 5.5) {
				console.log('⏳ Not time yet (or too late) for reminders');
				return json({
					success: true,
					skipped: true,
					reason: 'not-time-window',
					diffInHours,
					week: currentWeek
				});
			}
		}

		const firstKickoff = firstKickoffDate.toLocaleString('en-GB', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Europe/London'
		});

		// Get users with missing predictions
		const usersToNotify = await getUsersWithMissingPredictions(currentWeek);

		console.log(`👥 Found ${usersToNotify.length} users with missing predictions`);

		if (usersToNotify.length === 0) {
			return json({
				success: true,
				skipped: true,
				reason: 'all-predictions-complete',
				week: currentWeek
			});
		}

		// Get total fixtures count
		const totalFixtures = await db
			.select({ count: sql<number>`COUNT(*)::int` })
			.from(fixtures)
			.where(and(eq(fixtures.weekId, currentWeek), eq(fixtures.season, '2025-26')))
			.then((r) => r[0]?.count ?? 0);

		if (dryRun) {
			return json({
				success: true,
				dryRun: true,
				week: currentWeek,
				usersToNotify: usersToNotify.length,
				users: usersToNotify.map((u) => ({
					email: u.email,
					name: u.name,
					missingCount: u.missingCount
				})),
				firstKickoff,
				totalFixtures
			});
		}

		// Send emails in batches
		const results = {
			sent: 0,
			failed: 0,
			errors: [] as string[]
		};

		// Process in batches of 10 to respect rate limits
		const BATCH_SIZE = 10;
		for (let i = 0; i < usersToNotify.length; i += BATCH_SIZE) {
			const batch = usersToNotify.slice(i, i + BATCH_SIZE);

			await Promise.all(
				batch.map(async (user) => {
					try {
						// Render the email using dynamic import helper
						const { html, plainText } = await renderPredictionEmail({
							userName: user.name.split(' ')[0] || 'Player',
							week: currentWeek,
							missingCount: user.missingCount,
							totalFixtures,
							firstKickoff
						});

						// Send via Resend
						const emailResult = await resend.emails.send({
							from: 'Master League <reminders@mail.masterleague.app>',
							to: user.email,
							subject: `⚽ Week ${currentWeek}: ${user.missingCount} predictions needed!`,
							html,
							text: plainText
						});

						if (emailResult.error) {
							console.error(`❌ Failed to send to ${user.email}:`, emailResult.error);
							results.failed++;
							results.errors.push(`${user.email}: ${emailResult.error.message}`);
						} else {
							console.log(`✅ Sent reminder to ${user.email}`);
							results.sent++;
						}
					} catch (error) {
						console.error(`❌ Error sending to ${user.email}:`, error);
						results.failed++;
						results.errors.push(
							`${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
						);
					}
				})
			);

			// Small delay between batches to respect rate limits
			if (i + BATCH_SIZE < usersToNotify.length) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		const executionTime = Date.now() - startTime;

		console.log(`📧 Reminder job complete: ${results.sent} sent, ${results.failed} failed`);

		return json({
			success: true,
			week: currentWeek,
			totalUsers: usersToNotify.length,
			sent: results.sent,
			failed: results.failed,
			errors: results.errors.length > 0 ? results.errors : undefined,
			executionTime
		});
	} catch (error) {
		console.error('❌ Prediction reminder job failed:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// GET endpoint for health check / status
export const GET: RequestHandler = async () => {
	try {
		const currentWeek = await getCurrentWeek();
		const upcomingFixtures = await getUpcomingFixturesForWeek(currentWeek);
		const usersWithMissing = await getUsersWithMissingPredictions(currentWeek);

		return json({
			status: 'ready',
			currentWeek,
			upcomingFixtures: upcomingFixtures.length,
			usersWithMissingPredictions: usersWithMissing.length
		});
	} catch (error) {
		return json(
			{
				status: 'error',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
