import { db } from '$lib/server/db';
import { fixtures } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { auth } from '$lib/server/db/auth/auth';

export const load: LayoutServerLoad = async ({ request }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	let updatedFixtures = 0;

	// Only check for updates if user is logged in
	if (session?.user?.id) {
		try {
			const pendingFixtures = await db
				.select()
				.from(fixtures)
				.where(eq(fixtures.status, 'completed'))
				.limit(20);

			if (pendingFixtures.length > 0) {
				updatedFixtures = pendingFixtures.length;
			}
		} catch (err) {
			console.error('Error checking for fixture updates:', err);
		}
	}

	return {
		user: session?.user || null,
		fixtureUpdates: {
			success: true,
			updated: updatedFixtures
		}
	};
};
