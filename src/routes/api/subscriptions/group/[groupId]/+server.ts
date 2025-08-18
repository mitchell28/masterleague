import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { subscriptions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const groupId = params.groupId;

		// TODO: Check if user has permission to view this group's subscription
		// This would involve checking group membership

		// Get subscription for the group
		const subscription = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.referenceId, groupId))
			.limit(1);

		return json({
			subscription: subscription.length > 0 ? subscription[0] : null
		});
	} catch (error) {
		console.error('Error fetching subscription:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
