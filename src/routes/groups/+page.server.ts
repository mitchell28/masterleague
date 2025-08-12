import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { organization, member } from '$lib/server/db/auth/auth-schema';
import { eq, and } from 'drizzle-orm';

export const load = async ({ locals, url }) => {
	if (!locals.user?.id) {
		throw redirect(302, '/auth/login');
	}
};

export const actions: Actions = {
	deleteOrganization: async ({ request, locals }) => {
		if (!locals.user?.id) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const organizationId = formData.get('organizationId') as string;

		if (!organizationId) {
			return fail(400, { error: 'Organization ID is required' });
		}

		try {
			// Check if user is the owner of the organization
			const membershipCheck = await db
				.select({
					role: member.role
				})
				.from(member)
				.where(and(eq(member.organizationId, organizationId), eq(member.userId, locals.user.id)));

			if (membershipCheck.length === 0) {
				return fail(403, { error: 'You are not a member of this organization' });
			}

			if (membershipCheck[0].role !== 'owner') {
				return fail(403, { error: 'Only organization owners can delete organizations' });
			}

			// Delete all members first (foreign key constraint)
			await db.delete(member).where(eq(member.organizationId, organizationId));

			// Delete the organization
			await db.delete(organization).where(eq(organization.id, organizationId));

			return {
				success: true,
				message: 'Organization deleted successfully',
				deletedOrganizationId: organizationId
			};
		} catch (err) {
			console.error('Error deleting organization:', err);
			return fail(500, { error: 'Internal server error' });
		}
	}
};
