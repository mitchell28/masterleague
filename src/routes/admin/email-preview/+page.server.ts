import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { db, member } from '$lib/server/db';
import { fixtures, predictions } from '$lib/server/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { getCurrentWeek } from '$lib/server/engine/data/fixtures';

const templateConfigs = {
	'prediction-reminder': {
		props: {
			userName: 'Billy',
			week: 15,
			missingCount: 4,
			totalFixtures: 10,
			firstKickoff: 'Saturday, 14 December at 15:00'
		},
		subject: '⚽ Week 14: 4 predictions needed! '
	}
} as const;

type TemplateKey = keyof typeof templateConfigs;

// Dynamic import for email rendering - only runs at request time, not build time
async function renderEmail(template: TemplateKey, props: any) {
	const Renderer = (await import('better-svelte-email/render')).default;
	const { render } = new Renderer();

	if (template === 'prediction-reminder') {
		const PredictionReminder = (await import('$lib/emails/prediction-reminder.svelte')).default;
		return render(PredictionReminder, { props });
	}

	throw new Error(`Unknown template: ${template}`);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	// Only allow in development or for admins
	const isDev = import.meta.env.DEV;
	const isAdmin = locals.user?.role === 'admin';

	if (!isDev && !isAdmin) {
		throw redirect(302, '/');
	}

	// Get template from query param
	const templateParam = url.searchParams.get('template') || 'prediction-reminder';
	const template = (
		templateParam in templateConfigs ? templateParam : 'prediction-reminder'
	) as TemplateKey;

	// Fetch real data for the logged-in user
	let currentWeek = await getCurrentWeek();
	const userId = locals.user?.id;
	const userName = locals.user?.name || 'Admin';

	// Get fixtures for this week
	let weekFixtures = await db
		.select({ id: fixtures.id, matchDate: fixtures.matchDate })
		.from(fixtures)
		.where(and(eq(fixtures.weekId, currentWeek), eq(fixtures.season, '2025-26')))
		.orderBy(fixtures.matchDate);

	// If the week has started (first match passed), look at next week for the preview
	// This ensures the preview shows a realistic "upcoming" reminder state
	if (weekFixtures.length > 0 && new Date(weekFixtures[0].matchDate) < new Date()) {
		currentWeek++;
		weekFixtures = await db
			.select({ id: fixtures.id, matchDate: fixtures.matchDate })
			.from(fixtures)
			.where(and(eq(fixtures.weekId, currentWeek), eq(fixtures.season, '2025-26')))
			.orderBy(fixtures.matchDate);
	}

	const totalFixtures = weekFixtures.length;
	let missingCount = totalFixtures;

	if (userId && totalFixtures > 0) {
		// Get user's first organization (for preview purposes)
		const userMember = await db.query.member.findFirst({
			where: eq(member.userId, userId)
		});

		if (userMember) {
			const fixtureIds = weekFixtures.map((f) => f.id);
			const predictionCount = await db
				.select({ count: sql<number>`count(*)` })
				.from(predictions)
				.where(
					and(
						eq(predictions.userId, userId),
						eq(predictions.organizationId, userMember.organizationId),
						inArray(predictions.fixtureId, fixtureIds)
					)
				)
				.then((r) => Number(r[0].count));

			missingCount = Math.max(0, totalFixtures - predictionCount);
		}
	}

	const firstKickoff = weekFixtures[0]?.matchDate
		? new Date(weekFixtures[0].matchDate).toLocaleString('en-GB', {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				hour: '2-digit',
				minute: '2-digit',
				timeZone: 'Europe/London'
			})
		: 'Soon';

	const props = {
		userName,
		week: currentWeek,
		missingCount,
		totalFixtures,
		firstKickoff
	};

	// Render the email dynamically
	let renderedHtml = '';
	try {
		renderedHtml = await renderEmail(template, props);
	} catch (error) {
		console.error('Failed to render email:', error);
		renderedHtml = `<div style="padding: 20px; color: red;">Failed to render email: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
	}

	return {
		template,
		availableTemplates: Object.keys(templateConfigs),
		renderedHtml,
		props
	};
};

export const actions: Actions = {
	default: async ({ request, url, locals }) => {
		// Only allow in development or for admins
		const isDev = import.meta.env.DEV;
		const isAdmin = locals.user?.role === 'admin';

		if (!isDev && !isAdmin) {
			return fail(403, { error: 'Not authorized' });
		}

		const formData = await request.formData();
		const email = formData.get('email')?.toString();

		if (!email) {
			return fail(400, { error: 'Email is required' });
		}

		const templateParam = url.searchParams.get('template') || 'prediction-reminder';
		const template = (
			templateParam in templateConfigs ? templateParam : 'prediction-reminder'
		) as TemplateKey;

		const config = templateConfigs[template];

		// Fetch real data for the logged-in user (duplicated from load for now)
		let currentWeek = await getCurrentWeek();
		const userId = locals.user?.id;
		const userName = locals.user?.name || 'Admin';

		// Get fixtures for this week
		let weekFixtures = await db
			.select({ id: fixtures.id, matchDate: fixtures.matchDate })
			.from(fixtures)
			.where(and(eq(fixtures.weekId, currentWeek), eq(fixtures.season, '2025-26')))
			.orderBy(fixtures.matchDate);

		// If the week has started (first match passed), look at next week for the preview
		if (weekFixtures.length > 0 && new Date(weekFixtures[0].matchDate) < new Date()) {
			currentWeek++;
			weekFixtures = await db
				.select({ id: fixtures.id, matchDate: fixtures.matchDate })
				.from(fixtures)
				.where(and(eq(fixtures.weekId, currentWeek), eq(fixtures.season, '2025-26')))
				.orderBy(fixtures.matchDate);
		}

		const totalFixtures = weekFixtures.length;
		let missingCount = totalFixtures;

		if (userId && totalFixtures > 0) {
			const userMember = await db.query.member.findFirst({
				where: eq(member.userId, userId)
			});

			if (userMember) {
				const fixtureIds = weekFixtures.map((f) => f.id);
				const predictionCount = await db
					.select({ count: sql<number>`count(*)` })
					.from(predictions)
					.where(
						and(
							eq(predictions.userId, userId),
							eq(predictions.organizationId, userMember.organizationId),
							inArray(predictions.fixtureId, fixtureIds)
						)
					)
					.then((r) => Number(r[0].count));

				missingCount = Math.max(0, totalFixtures - predictionCount);
			}
		}

		const firstKickoff = weekFixtures[0]?.matchDate
			? new Date(weekFixtures[0].matchDate).toLocaleString('en-GB', {
					weekday: 'long',
					day: 'numeric',
					month: 'long',
					hour: '2-digit',
					minute: '2-digit',
					timeZone: 'Europe/London'
				})
			: 'Soon';

		const props = {
			userName,
			week: currentWeek,
			missingCount,
			totalFixtures,
			firstKickoff
		};

		try {
			const { Resend } = await import('resend');
			const { getEnvVar } = await import('$lib/server/utils/env');

			const resend = new Resend(getEnvVar('RESEND_API_KEY'));
			const html = await renderEmail(template, props);

			await resend.emails.send({
				from: 'Master League <noreply@mail.masterleague.app>',
				to: email,
				subject: `[TEST] ${config.subject}`,
				html
			});

			return { success: true, message: `Test email sent to ${email}` };
		} catch (error) {
			console.error('Failed to send test email:', error);
			return fail(500, { error: 'Failed to send email' });
		}
	}
};
