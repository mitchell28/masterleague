import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { betterAuthOptions } from './betterauth-options';
import { assignUserToDefaultOrganization } from './organization-utils';
import { addUserToLeagueTable } from '$lib/server/utils/league-utils';

// Create and export the auth instance with hooks
export const auth = betterAuth({
	...betterAuthOptions,

	hooks: {
		after: createAuthMiddleware(async (ctx) => {
			console.log('Auth Path', ctx.path);
			console.log('Auth Context:', ctx.context.session);
			// Handle email verification completion - add to organization and league table
			if (ctx.path.includes('/email-otp/verify-email')) {
				console.log('Email verification completed, context:', ctx.context.returned.user);

				// Get user from session or newSession
				const user = ctx.context.newSession?.user || ctx.context?.returned?.user;

				if (user) {
					console.log('✅ [Auth] Email verified for user:', {
						id: user.id,
						username: user.name,
						email: user.email,
						emailVerified: user.emailVerified
					});

					// Only proceed if email is now verified
					if (user.emailVerified) {
						try {
							await assignUserToDefaultOrganization(user.id);
							console.log(
								`✅ [Auth] User ${user.id} assigned to default organization after email verification`
							);

							// Get the default organization to add user to league table
							const { db } = await import('../index');
							const { organization } = await import('./auth-schema');
							const { eq } = await import('drizzle-orm');

							const defaultOrg = await db
								.select()
								.from(organization)
								.where(eq(organization.slug, 'master-league'))
								.limit(1);

							if (defaultOrg[0]) {
								await addUserToLeagueTable(user.id, defaultOrg[0].id);
								console.log(
									`✅ [Auth] User ${user.id} added to league table after email verification`
								);
							}
						} catch (error) {
							console.error(
								`❌ [Auth] Failed to assign user ${user.id} to default organization after email verification:`,
								error
							);
						}
					}
				}
			}
		})
	}
});

// Export types
export type Auth = typeof auth;

// Default export for Better Auth auto-discovery
export default auth;
