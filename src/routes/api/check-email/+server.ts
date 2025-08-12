import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth/auth-schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email } = await request.json();

		if (!email || typeof email !== 'string') {
			return json({ error: 'Email is required' }, { status: 400 });
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return json(
				{
					error: 'Please enter a valid email address.',
					taken: false,
					invalid: true
				},
				{ status: 400 }
			);
		}

		// Check if email exists in database
		const existingUser = await db
			.select({ id: user.id, email: user.email })
			.from(user)
			.where(eq(user.email, email))
			.limit(1);

		return json({
			taken: existingUser.length > 0,
			email
		});
	} catch (error) {
		console.error('❌ Email check error:', error);
		return json({ error: 'Failed to check email' }, { status: 500 });
	}
};
