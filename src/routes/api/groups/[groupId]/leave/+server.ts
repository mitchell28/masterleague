import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups, groupMemberships } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const groupId = params.groupId;

		// Check if user is a member of this group
		const membership = await db
			.select()
			.from(groupMemberships)
			.where(
				and(
					eq(groupMemberships.groupId, groupId),
					eq(groupMemberships.userId, locals.user.id),
					eq(groupMemberships.isActive, true)
				)
			)
			.limit(1);

		if (membership.length === 0) {
			return json({ error: 'You are not a member of this group' }, { status: 404 });
		}

		// Check if user is the owner
		if (membership[0].role === 'owner') {
			return json(
				{ error: 'Group owners cannot leave the group. Transfer ownership first.' },
				{ status: 400 }
			);
		}

		// Deactivate membership
		await db
			.update(groupMemberships)
			.set({ isActive: false })
			.where(eq(groupMemberships.id, membership[0].id));

		return json({ success: true });
	} catch (error) {
		console.error('Error leaving group:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
