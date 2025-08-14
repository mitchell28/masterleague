import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { invitation, member, organization, authUser } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { organizationId, email, role = 'member' } = await request.json();

		if (!organizationId?.trim() || !email?.trim()) {
			return json({ error: 'Organization ID and email are required' }, { status: 400 });
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return json({ error: 'Invalid email format' }, { status: 400 });
		}

		// Check if user is an admin/owner of the organization
		const senderMembership = await db
			.select()
			.from(member)
			.where(and(eq(member.organizationId, organizationId), eq(member.userId, locals.user.id)))
			.limit(1);

		if (senderMembership.length === 0 || !['admin', 'owner'].includes(senderMembership[0].role)) {
			return json({ error: 'Insufficient permissions to send invitations' }, { status: 403 });
		}

		// Check if invited user already exists and is a member
		const existingUser = await db.select().from(authUser).where(eq(authUser.email, email)).limit(1);

		if (existingUser.length > 0) {
			const existingMembership = await db
				.select()
				.from(member)
				.where(
					and(eq(member.organizationId, organizationId), eq(member.userId, existingUser[0].id))
				)
				.limit(1);

			if (existingMembership.length > 0) {
				return json({ error: 'User is already a member of this organization' }, { status: 409 });
			}
		}

		// Check if there's already a pending invitation
		const existingInvitation = await db
			.select()
			.from(invitation)
			.where(
				and(
					eq(invitation.organizationId, organizationId),
					eq(invitation.email, email),
					eq(invitation.status, 'pending')
				)
			)
			.limit(1);

		if (existingInvitation.length > 0) {
			return json({ error: 'Invitation already sent to this email' }, { status: 409 });
		}

		// Create invitation
		const invitationId = randomUUID();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

		const newInvitation = await db
			.insert(invitation)
			.values({
				id: invitationId,
				organizationId,
				email,
				role,
				inviterId: locals.user.id,
				status: 'pending',
				expiresAt: expiresAt
			})
			.returning();

		// Fetch organization details for the response
		const organizationRecord = await db
			.select()
			.from(organization)
			.where(eq(organization.id, organizationId))
			.limit(1);

		return json({
			invitation: newInvitation[0],
			organization: organizationRecord[0]
		});
	} catch (error) {
		console.error('Error creating invitation:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ url, locals }) => {
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
		const membership = await db
			.select()
			.from(member)
			.where(and(eq(member.organizationId, organizationId), eq(member.userId, locals.user.id)))
			.limit(1);

		if (membership.length === 0) {
			return json({ error: 'Not a member of this organization' }, { status: 403 });
		}

		// Fetch pending invitations
		const invitations = await db
			.select({
				invitation: invitation,
				inviter: {
					id: authUser.id,
					name: authUser.name,
					email: authUser.email
				}
			})
			.from(invitation)
			.innerJoin(authUser, eq(invitation.inviterId, authUser.id))
			.where(and(eq(invitation.organizationId, organizationId), eq(invitation.status, 'pending')));

		return json({ invitations });
	} catch (error) {
		console.error('Error fetching invitations:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const invitationId = url.searchParams.get('invitationId');

		if (!invitationId?.trim()) {
			return json({ error: 'Invitation ID is required' }, { status: 400 });
		}

		// Find the invitation
		const invitationRecord = await db
			.select()
			.from(invitation)
			.where(eq(invitation.id, invitationId))
			.limit(1);

		if (invitationRecord.length === 0) {
			return json({ error: 'Invitation not found' }, { status: 404 });
		}

		const invite = invitationRecord[0];

		// Check if user is an admin/owner of the organization or the person who sent the invitation
		const membership = await db
			.select()
			.from(member)
			.where(
				and(eq(member.organizationId, invite.organizationId), eq(member.userId, locals.user.id))
			)
			.limit(1);

		const canCancel =
			membership.length > 0 &&
			(['admin', 'owner'].includes(membership[0].role) || invite.inviterId === locals.user.id);

		if (!canCancel) {
			return json({ error: 'Insufficient permissions to cancel this invitation' }, { status: 403 });
		}

		// Cancel the invitation
		await db
			.update(invitation)
			.set({
				status: 'cancelled'
			})
			.where(eq(invitation.id, invitationId));

		return json({ success: true });
	} catch (error) {
		console.error('Error cancelling invitation:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
