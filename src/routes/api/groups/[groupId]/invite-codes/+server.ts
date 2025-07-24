import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groupInviteCodes, groups, groupMemberships } from '$lib/server/db/schema';
import { auth } from '$lib/server/db/auth/auth';
import { eq, and, count } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// GET - Get all invite codes for a group
export const GET: RequestHandler = async ({ params, request }) => {
	try {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const { groupId } = params;

		// Check if user is owner or admin of the group
		const membership = await db
			.select()
			.from(groupMemberships)
			.where(
				and(
					eq(groupMemberships.groupId, groupId),
					eq(groupMemberships.userId, session.user.id),
					eq(groupMemberships.isActive, true)
				)
			)
			.limit(1);

		if (!membership.length || !['owner', 'admin'].includes(membership[0].role)) {
			return json(
				{ message: 'Forbidden - Only group owners and admins can view invite codes' },
				{ status: 403 }
			);
		}

		// Get all invite codes for the group with creator and user info
		const inviteCodes = await db
			.select({
				id: groupInviteCodes.id,
				code: groupInviteCodes.code,
				createdAt: groupInviteCodes.createdAt,
				usedAt: groupInviteCodes.usedAt,
				expiresAt: groupInviteCodes.expiresAt,
				isActive: groupInviteCodes.isActive,
				createdBy: groupInviteCodes.createdBy,
				usedBy: groupInviteCodes.usedBy
			})
			.from(groupInviteCodes)
			.where(and(eq(groupInviteCodes.groupId, groupId), eq(groupInviteCodes.isActive, true)))
			.orderBy(groupInviteCodes.createdAt);

		return json({ inviteCodes });
	} catch (error) {
		console.error('Error fetching invite codes:', error);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};

// POST - Create a new invite code
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const { groupId } = params;

		// Check if user is owner or admin of the group
		const membership = await db
			.select()
			.from(groupMemberships)
			.where(
				and(
					eq(groupMemberships.groupId, groupId),
					eq(groupMemberships.userId, session.user.id),
					eq(groupMemberships.isActive, true)
				)
			)
			.limit(1);

		if (!membership.length || !['owner', 'admin'].includes(membership[0].role)) {
			return json(
				{ message: 'Forbidden - Only group owners and admins can create invite codes' },
				{ status: 403 }
			);
		}

		// Check if group exists and is active
		const group = await db
			.select()
			.from(groups)
			.where(and(eq(groups.id, groupId), eq(groups.isActive, true)))
			.limit(1);

		if (!group.length) {
			return json({ message: 'Group not found' }, { status: 404 });
		}

		// Count existing active invite codes for this group
		const codeCount = await db
			.select({ count: count() })
			.from(groupInviteCodes)
			.where(and(eq(groupInviteCodes.groupId, groupId), eq(groupInviteCodes.isActive, true)));

		if (codeCount[0].count >= 10) {
			return json({ message: 'Maximum of 10 invite codes allowed per group' }, { status: 400 });
		}

		// Generate unique invite code
		const code = randomBytes(4).toString('hex').toUpperCase();
		const inviteCodeId = randomBytes(15).toString('hex');

		// Create the invite code
		const newInviteCode = await db
			.insert(groupInviteCodes)
			.values({
				id: inviteCodeId,
				groupId: groupId,
				code: code,
				createdBy: session.user.id,
				createdAt: new Date(),
				isActive: true
			})
			.returning();

		return json({
			code: newInviteCode[0].code,
			id: newInviteCode[0].id
		});
	} catch (error) {
		console.error('Error creating invite code:', error);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
