import { auth } from '$lib/server/db/auth/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	return {
		user: session?.user || null,
		fixtureUpdates: {
			success: true,
			updated: 0
		}
	};
};
