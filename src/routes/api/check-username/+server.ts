import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth/auth-schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { username } = await request.json();

		if (!username || typeof username !== 'string') {
			return json({ error: 'Username is required' }, { status: 400 });
		}

		// Validate username format before checking database
		const usernameRegex = /^[a-zA-Z0-9_-]+$/;
		if (!usernameRegex.test(username) || !username.match(/^[a-zA-Z]/)) {
			return json(
				{
					error:
						'Username can only contain letters, numbers, underscores, and hyphens. Must start with a letter.',
					taken: false,
					invalid: true
				},
				{ status: 400 }
			);
		}

		// Check if username exists in database
		const existingUser = await db
			.select({ id: user.id, username: user.username })
			.from(user)
			.where(eq(user.username, username))
			.limit(1);

		return json({
			taken: existingUser.length > 0,
			username
		});
	} catch (error) {
		console.error('❌ Username check error:', error);
		return json({ error: 'Failed to check username' }, { status: 500 });
	}
};
