import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups, groupMemberships, subscriptions } from '$lib/server/db/schema';
import { user as authUser } from '$lib/server/db/auth/auth-schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get all groups where user is a member
		const userGroups = await db
			.select({
				group: groups,
				membership: groupMemberships,
				subscription: subscriptions
			})
			.from(groupMemberships)
			.innerJoin(groups, eq(groupMemberships.groupId, groups.id))
			.leftJoin(subscriptions, eq(groups.id, subscriptions.referenceId))
			.where(and(eq(groupMemberships.userId, locals.user.id), eq(groupMemberships.isActive, true)));

		// Get all members for each group
		const groupsWithMembers = await Promise.all(
			userGroups.map(async ({ group, subscription }) => {
				const memberships = await db
					.select({
						id: groupMemberships.id,
						groupId: groupMemberships.groupId,
						userId: groupMemberships.userId,
						role: groupMemberships.role,
						joinedAt: groupMemberships.joinedAt,
						isActive: groupMemberships.isActive,
						user: {
							id: authUser.id,
							name: authUser.name,
							email: authUser.email,
							username: authUser.username
						}
					})
					.from(groupMemberships)
					.innerJoin(authUser, eq(groupMemberships.userId, authUser.id))
					.where(and(eq(groupMemberships.groupId, group.id), eq(groupMemberships.isActive, true)));

				return {
					...group,
					memberships,
					subscription,
					memberCount: memberships.length
				};
			})
		);

		return json({ groups: groupsWithMembers });
	} catch (error) {
		console.error('Error fetching user groups:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { name, description, maxMembers = 10 } = await request.json();

		if (!name?.trim()) {
			return json({ error: 'Group name is required' }, { status: 400 });
		}

		const groupId = randomBytes(16).toString('hex');
		const membershipId = randomBytes(16).toString('hex');
		const now = new Date();

		// Create group
		await db.insert(groups).values({
			id: groupId,
			name: name.trim(),
			description: description?.trim() || null,
			ownerId: locals.user.id,
			maxMembers,
			isActive: true,
			createdAt: now,
			updatedAt: now
		});

		// Add creator as owner
		await db.insert(groupMemberships).values({
			id: membershipId,
			groupId,
			userId: locals.user.id,
			role: 'owner',
			joinedAt: now,
			isActive: true
		});

		// Fetch the created group with membership data
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
			.where(eq(groups.id, groupId));

		const result = {
			...groupWithMembers[0].group,
			memberships: groupWithMembers.map((item) => ({
				...item.membership,
				user: item.user
			})),
			subscription: null,
			memberCount: 1
		};

		return json({ group: result });
	} catch (error) {
		console.error('Error creating group:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
