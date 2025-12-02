import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';

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
	},
	welcome: {
		props: {
			userName: 'Billy'
		},
		subject: 'Welcome to Master League! 🎉'
	}
} as const;

type TemplateKey = keyof typeof templateConfigs;

// Dynamic import for email rendering - only runs at request time, not build time
async function renderEmail(template: TemplateKey) {
	const Renderer = (await import('better-svelte-email/render')).default;
	const { render } = new Renderer();

	if (template === 'prediction-reminder') {
		const PredictionReminder = (await import('$lib/emails/prediction-reminder.svelte')).default;
		return render(PredictionReminder, { props: templateConfigs[template].props });
	} else {
		const Welcome = (await import('$lib/emails/welcome.svelte')).default;
		return render(Welcome, { props: templateConfigs[template].props });
	}
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

	const config = templateConfigs[template];

	// Render the email dynamically
	let renderedHtml = '';
	try {
		renderedHtml = await renderEmail(template);
	} catch (error) {
		console.error('Failed to render email:', error);
		renderedHtml = `<div style="padding: 20px; color: red;">Failed to render email: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
	}

	return {
		template,
		availableTemplates: Object.keys(templateConfigs),
		renderedHtml,
		props: config.props
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

		try {
			const { Resend } = await import('resend');
			const { getEnvVar } = await import('$lib/server/utils/env');

			const resend = new Resend(getEnvVar('RESEND_API_KEY'));
			const html = await renderEmail(template);

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
