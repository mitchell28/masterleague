import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groupInviteCodes, groupMemberships } from '$lib/server/db/schema';
import { auth } from '$lib/server/db/auth/auth';
import { eq, and } from 'drizzle-orm';

// DELETE - Delete an invite code
export const DELETE: RequestHandler = async ({ params, request }) => {
	try {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const { codeId } = params;

		// Get the invite code to check group membership
		const inviteCode = await db
			.select({
				id: groupInviteCodes.id,
				groupId: groupInviteCodes.groupId,
				createdBy: groupInviteCodes.createdBy
			})
			.from(groupInviteCodes)
			.where(eq(groupInviteCodes.id, codeId))
			.limit(1);

		if (!inviteCode.length) {
			return json({ message: 'Invite code not found' }, { status: 404 });
		}

		const code = inviteCode[0];

		// Check if user is owner/admin of the group or creator of the code
		const membership = await db
			.select()
			.from(groupMemberships)
			.where(
				and(
					eq(groupMemberships.groupId, code.groupId),
					eq(groupMemberships.userId, session.user.id),
					eq(groupMemberships.isActive, true)
				)
			)
			.limit(1);

		const isOwnerOrAdmin = membership.length && ['owner', 'admin'].includes(membership[0].role);
		const isCreator = code.createdBy === session.user.id;

		if (!isOwnerOrAdmin && !isCreator) {
			return json(
				{
					message:
						'Forbidden - You can only delete invite codes you created or if you are a group admin'
				},
				{ status: 403 }
			);
		}

		// Soft delete the invite code
		await db
			.update(groupInviteCodes)
			.set({
				isActive: false
			})
			.where(eq(groupInviteCodes.id, codeId));

		return json({ message: 'Invite code deleted successfully' });
	} catch (error) {
		console.error('Error deleting invite code:', error);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
