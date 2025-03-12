import { db } from '$lib/server/db';
import { fixtures } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	depends('fixtures:updates');

	let updatedFixtures = 0;

	// Only check for updates if user is logged in
	if (locals.user?.id) {
		try {
			// Get fixtures that need score updates
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
		user: locals.user,
		fixtureUpdates: {
			success: true,
			updated: updatedFixtures
		}
	};
};
