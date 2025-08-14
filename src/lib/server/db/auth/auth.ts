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
			// Handle email verification completion - add to organization and league table
			if (ctx.path.includes('/email-otp/verify-email')) {
				// Get user from session or newSession
				const user = (ctx.context as any).newSession?.user || (ctx.context as any).returned?.user;

				if (!user) {
					return;
				}

				// Only proceed if email is now verified
				if (!user.emailVerified) {
					return;
				}

				try {
					// Assign user to default organization
					await assignUserToDefaultOrganization(user.id);

					// Get the default organization to add user to league table
					const { db } = await import('../index');
					const { organization } = await import('./auth-schema');
					const { eq } = await import('drizzle-orm');

					const defaultOrg = await db
						.select()
						.from(organization)
						.where(eq(organization.slug, 'master-league'))
						.limit(1);

					if (!defaultOrg[0]) {
						throw new Error('Default organization not found');
					}

					// Add user to league table
					await addUserToLeagueTable(user.id, defaultOrg[0].id);
				} catch (error) {
					// Re-throw with context for upstream error handling
					throw new Error(
						`Failed to complete user setup after email verification for user ${user.id}: ${
							error instanceof Error ? error.message : 'Unknown error'
						}`
					);
				}
			}
		})
	}
});

// Export types
export type Auth = typeof auth;

// Default export for Better Auth auto-discovery
export default auth;
