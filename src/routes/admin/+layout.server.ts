import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		throw redirect(302, '/auth/admin');
	}

	// Check if user is an admin
	const userData = await db.select().from(user).where(eq(user.id, locals.user.id)).limit(1);

	if (userData.length === 0 || userData[0].role !== 'admin') {
		throw redirect(302, '/');
	}

	return {
		user: locals.user
	};
};
