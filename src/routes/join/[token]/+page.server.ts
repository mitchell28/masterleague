import { db } from '$lib/server/db';
import { invitation, organization, user as authUser } from '$lib/server/db/auth/auth-schema';
import { eq, and, gt } from 'drizzle-orm';
import { error, redirect, fail } from '@sveltejs/kit';
import auth from '$lib/server/db/auth/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { token } = params;

	// Look up invitation
	const [invite] = await db
		.select({
			id: invitation.id,
			email: invitation.email,
			role: invitation.role,
			status: invitation.status,
			expiresAt: invitation.expiresAt,
			orgId: invitation.organizationId,
			inviterId: invitation.inviterId
		})
		.from(invitation)
		.where(eq(invitation.id, token))
		.limit(1);

	if (!invite) throw error(404, 'Invitation not found');

	if (invite.status !== 'pending') {
		return {
			invite: null,
			org: null,
			inviter: null,
			errorMessage:
				invite.status === 'accepted'
					? 'This invitation has already been accepted.'
					: invite.status === 'cancelled'
						? 'This invitation has been cancelled.'
						: 'This invitation is no longer valid.'
		};
	}

	if (new Date(invite.expiresAt) < new Date()) {
		return {
			invite: null,
			org: null,
			inviter: null,
			errorMessage: 'This invitation has expired.'
		};
	}

	const [[org], [inviter]] = await Promise.all([
		db
			.select({ id: organization.id, name: organization.name, slug: organization.slug })
			.from(organization)
			.where(eq(organization.id, invite.orgId))
			.limit(1),
		db
			.select({ id: authUser.id, name: authUser.name })
			.from(authUser)
			.where(eq(authUser.id, invite.inviterId))
			.limit(1)
	]);

	// If not logged in, save the return URL so we redirect back after auth
	if (!locals.user?.id) {
		return {
			invite: { id: invite.id, email: invite.email, role: invite.role },
			org: org ?? null,
			inviter: inviter ?? null,
			errorMessage: null,
			requiresAuth: true,
			loginUrl: `/auth/login?returnTo=${encodeURIComponent(url.pathname)}`
		};
	}

	return {
		invite: { id: invite.id, email: invite.email, role: invite.role },
		org: org ?? null,
		inviter: inviter ?? null,
		errorMessage: null,
		requiresAuth: false,
		loginUrl: null
	};
};

export const actions: Actions = {
	accept: async ({ params, locals, request }) => {
		if (!locals.user?.id) return fail(401, { error: 'Not authenticated' });

		try {
			await auth.api.acceptInvitation({
				body: { invitationId: params.token },
				headers: request.headers
			});
		} catch (e: any) {
			return fail(400, { error: e?.message ?? 'Failed to accept invitation' });
		}

		throw redirect(303, '/predictions');
	},

	reject: async ({ params, locals, request }) => {
		if (!locals.user?.id) return fail(401, { error: 'Not authenticated' });

		try {
			await auth.api.rejectInvitation({
				body: { invitationId: params.token },
				headers: request.headers
			});
		} catch (e: any) {
			return fail(400, { error: e?.message ?? 'Failed to reject invitation' });
		}

		throw redirect(303, '/');
	}
};
