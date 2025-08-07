import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { member, organization, authUser } from '../../../../../drizzle/schema';
import { eq, and, count } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ url, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const organizationId = url.searchParams.get('organizationId');

		if (!organizationId?.trim()) {
			return json({ error: 'Organization ID is required' }, { status: 400 });
		}

		// Check if user is a member of the organization
		const membershipRecord = await db
			.select()
			.from(member)
			.where(and(eq(member.organizationId, organizationId), eq(member.userId, locals.user.id)))
			.limit(1);

		if (membershipRecord.length === 0) {
			return json({ error: 'You are not a member of this organization' }, { status: 404 });
		}

		const membership = membershipRecord[0];

		// Check if this is the last owner leaving
		const ownerCount = await db
			.select({ count: count() })
			.from(member)
			.where(and(eq(member.organizationId, organizationId), eq(member.role, 'owner')));

		if (membership.role === 'owner' && ownerCount[0].count <= 1) {
			return json(
				{
					error: 'Cannot leave organization as the last owner. Transfer ownership first.'
				},
				{ status: 400 }
			);
		}

		// Remove membership
		await db
			.delete(member)
			.where(and(eq(member.organizationId, organizationId), eq(member.userId, locals.user.id)));

		return json({ success: true });
	} catch (error) {
		console.error('Error leaving organization:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
