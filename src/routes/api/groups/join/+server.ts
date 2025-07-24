import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups, groupMemberships, groupInviteCodes } from '$lib/server/db/schema';
import { user as authUser } from '$lib/server/db/auth/auth-schema';
import { eq, and, isNull } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { inviteCode } = await request.json();

		if (!inviteCode?.trim()) {
			return json({ error: 'Invite code is required' }, { status: 400 });
		}

		// Find active invite code
		const inviteCodeRecord = await db
			.select({
				id: groupInviteCodes.id,
				groupId: groupInviteCodes.groupId,
				code: groupInviteCodes.code,
				usedBy: groupInviteCodes.usedBy,
				expiresAt: groupInviteCodes.expiresAt
			})
			.from(groupInviteCodes)
			.where(
				and(
					eq(groupInviteCodes.code, inviteCode.trim().toUpperCase()),
					eq(groupInviteCodes.isActive, true),
					isNull(groupInviteCodes.usedBy) // Not used yet
				)
			)
			.limit(1);

		if (inviteCodeRecord.length === 0) {
			return json({ error: 'Invalid or already used invite code' }, { status: 404 });
		}

		const inviteRecord = inviteCodeRecord[0];

		// Check if invite code is expired
		if (inviteRecord.expiresAt && new Date(inviteRecord.expiresAt) < new Date()) {
			return json({ error: 'Invite code has expired' }, { status: 410 });
		}

		// Find the group
		const group = await db
			.select()
			.from(groups)
			.where(and(eq(groups.id, inviteRecord.groupId), eq(groups.isActive, true)))
			.limit(1);

		if (group.length === 0) {
			return json({ error: 'Group not found or inactive' }, { status: 404 });
		}

		const targetGroup = group[0];

		// Check if user is already a member
		const existingMembership = await db
			.select()
			.from(groupMemberships)
			.where(
				and(
					eq(groupMemberships.groupId, targetGroup.id),
					eq(groupMemberships.userId, locals.user.id)
				)
			)
			.limit(1);

		if (existingMembership.length > 0) {
			// If membership exists but is inactive, reactivate it
			if (!existingMembership[0].isActive) {
				await db
					.update(groupMemberships)
					.set({
						isActive: true,
						joinedAt: new Date()
					})
					.where(eq(groupMemberships.id, existingMembership[0].id));
			} else {
				return json({ error: 'You are already a member of this group' }, { status: 409 });
			}
		} else {
			// Check if group is full
			const currentMemberCount = await db
				.select()
				.from(groupMemberships)
				.where(
					and(eq(groupMemberships.groupId, targetGroup.id), eq(groupMemberships.isActive, true))
				);

			if (currentMemberCount.length >= targetGroup.maxMembers) {
				return json({ error: 'Group is full' }, { status: 409 });
			}

			// Add user as member
			const membershipId = randomBytes(16).toString('hex');
			await db.insert(groupMemberships).values({
				id: membershipId,
				groupId: targetGroup.id,
				userId: locals.user.id,
				role: 'member',
				joinedAt: new Date(),
				isActive: true
			});
		}

		// Mark invite code as used
		await db
			.update(groupInviteCodes)
			.set({
				usedBy: locals.user.id,
				usedAt: new Date()
			})
			.where(eq(groupInviteCodes.id, inviteRecord.id));

		// Fetch the group with membership data
		const groupWithMembers = await db
			.select({
				group: groups,
				membership: groupMemberships,
				user: {
					id: authUser.id,
					name: authUser.name,
					email: authUser.email,
					username: authUser.username
				}
			})
			.from(groups)
			.innerJoin(groupMemberships, eq(groups.id, groupMemberships.groupId))
			.innerJoin(authUser, eq(groupMemberships.userId, authUser.id))
			.where(and(eq(groups.id, targetGroup.id), eq(groupMemberships.isActive, true)));

		const result = {
			...targetGroup,
			memberships: groupWithMembers.map((item) => ({
				...item.membership,
				user: item.user
			})),
			subscription: null, // TODO: Fetch subscription if needed
			memberCount: groupWithMembers.length
		};

		return json({ group: result });
	} catch (error) {
		console.error('Error joining group:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
