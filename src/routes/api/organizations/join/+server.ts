import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	organization,
	member,
	invitation,
	user as authUser
} from '$lib/server/db/auth/auth-schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

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

		// Find active invitation
		const invitationRecord = await db
			.select()
			.from(invitation)
			.where(and(eq(invitation.email, locals.user.email), eq(invitation.status, 'pending')))
			.limit(1);

		if (invitationRecord.length === 0) {
			return json({ error: 'Invalid or expired invitation' }, { status: 404 });
		}

		const invite = invitationRecord[0];

		// Check if invitation is expired
		if (new Date(invite.expiresAt) < new Date()) {
			return json({ error: 'Invitation has expired' }, { status: 410 });
		}

		// Find the organization
		const organizationRecord = await db
			.select()
			.from(organization)
			.where(eq(organization.id, invite.organizationId))
			.limit(1);

		if (organizationRecord.length === 0) {
			return json({ error: 'Organization not found' }, { status: 404 });
		}

		const targetOrganization = organizationRecord[0];

		// Check if user is already a member
		const existingMembership = await db
			.select()
			.from(member)
			.where(
				and(eq(member.organizationId, targetOrganization.id), eq(member.userId, locals.user.id))
			)
			.limit(1);

		if (existingMembership.length > 0) {
			return json({ error: 'You are already a member of this organization' }, { status: 409 });
		}

		// Add user as member
		const membershipId = randomUUID();
		await db.insert(member).values({
			id: membershipId,
			userId: locals.user.id,
			organizationId: targetOrganization.id,
			role: invite.role,
			createdAt: new Date()
		});

		// Mark invitation as accepted
		await db
			.update(invitation)
			.set({
				status: 'accepted'
			})
			.where(eq(invitation.id, invite.id));

		// Fetch the organization with membership data
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
			.where(eq(organization.id, targetOrganization.id));

		const result = {
			...targetOrganization,
			memberships: organizationWithMembers.map((item) => ({
				...item.membership,
				user: item.user
			})),
			subscription: null, // TODO: Fetch subscription if needed
			memberCount: organizationWithMembers.length
		};

		return json({ organization: result });
	} catch (error) {
		console.error('Error joining organization:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
