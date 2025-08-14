import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth/auth-schema';
import { eq } from 'drizzle-orm';

/**
 * Check if an email exists in the system and get verification status
 * This is a server-only function for security
 */
export async function checkEmailStatus(email: string) {
	try {
		const existingUser = await db.query.user.findFirst({
			where: eq(user.email, email),
			columns: {
				id: true,
				email: true,
				emailVerified: true
			}
		});

		return {
			exists: !!existingUser,
			emailVerified: existingUser?.emailVerified ?? false,
			userId: existingUser?.id
		};
	} catch (error) {
		console.error('Error checking email status:', error);
		throw new Error('Database error while checking email');
	}
}

/**
 * Check if a username is taken (assumes username is already validated by Zod schema)
 * This only checks database availability, not format validation
 */
export async function checkUsernameAvailability(username: string) {
	const existingUser = await db.query.user.findFirst({
		where: eq(user.username, username),
		columns: {
			id: true
		}
	});

	return {
		available: !existingUser
	};
}
