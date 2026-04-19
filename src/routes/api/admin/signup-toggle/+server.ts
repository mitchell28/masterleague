import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { areSignupsEnabled, setSignupsEnabled } from '$lib/server/site-settings';

/** GET /api/admin/signup-toggle – returns current state */
export const GET: RequestHandler = async ({ locals }) => {
	if (locals.user?.role !== 'admin') {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	const enabled = await areSignupsEnabled();
	return json({ enabled });
};

/** POST /api/admin/signup-toggle – toggles or sets the state */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (locals.user?.role !== 'admin') {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	let enabled: boolean;

	const body = await request.json().catch(() => null);
	if (body && typeof body.enabled === 'boolean') {
		enabled = body.enabled;
	} else {
		// Toggle current value
		const current = await areSignupsEnabled();
		enabled = !current;
	}

	await setSignupsEnabled(enabled);

	return json({
		success: true,
		enabled,
		message: enabled ? 'Sign-ups are now open' : 'Sign-ups are now closed'
	});
};
