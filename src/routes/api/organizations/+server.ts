import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, organization, member, user as authUser } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get all organizations where user is a member
		const userOrganizations = await db
			.select({
				organization: organization,
				membership: member
			})
			.from(member)
			.innerJoin(organization, eq(member.organizationId, organization.id))
			.where(eq(member.userId, locals.user.id));

		// Get all members for each organization
		const organizationsWithMembers = await Promise.all(
			userOrganizations.map(async ({ organization: org }) => {
				const memberships = await db
					.select({
						id: member.id,
						organizationId: member.organizationId,
						userId: member.userId,
						role: member.role,
						createdAt: member.createdAt,
						user: {
							id: authUser.id,
							name: authUser.name,
							email: authUser.email,
							username: authUser.username
						}
					})
					.from(member)
					.innerJoin(authUser, eq(member.userId, authUser.id))
					.where(eq(member.organizationId, org.id));

				return {
					...org,
					memberships,
					subscription: null, // TODO: Add subscription support
					memberCount: memberships.length
				};
			})
		);

		return json({ organizations: organizationsWithMembers });
	} catch (error) {
		console.error('Error fetching user organizations:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { name, slug } = await request.json();

		if (!name?.trim()) {
			return json({ error: 'Organization name is required' }, { status: 400 });
		}

		const organizationId = randomUUID();
		const membershipId = randomUUID();
		const now = new Date();

		// Create organization
		await db.insert(organization).values({
			id: organizationId,
			name: name.trim(),
			slug:
				slug?.trim() ||
				name
					.trim()
					.toLowerCase()
					.replace(/[^a-z0-9-]/g, '-'),
			logo: null,
			metadata: null,
			createdAt: now,
			updatedAt: now
		});

		// Add creator as owner
		await db.insert(member).values({
			id: membershipId,
			userId: locals.user.id,
			organizationId,
			role: 'owner',
			createdAt: now
		});

		// Fetch the created organization with membership data
		const organizationWithMembers = await db
			.select({
				organization: organization,
				membership: member,
				user: {
					id: authUser.id,
					name: authUser.name,
					email: authUser.email,
					username: authUser.username
				}
			})
			.from(organization)
			.innerJoin(member, eq(organization.id, member.organizationId))
			.innerJoin(authUser, eq(member.userId, authUser.id))
			.where(eq(organization.id, organizationId));

		const result = {
			...organizationWithMembers[0].organization,
			memberships: organizationWithMembers.map((item) => ({
				...item.membership,
				user: item.user
			})),
			subscription: null,
			memberCount: 1
		};

		return json({ organization: result });
	} catch (error) {
		console.error('Error creating organization:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
