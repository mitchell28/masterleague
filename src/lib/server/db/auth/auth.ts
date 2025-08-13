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
			// Handle user sign-up completion - add to organization
			if (ctx.path.startsWith('/sign-up')) {
				const newSession = ctx.context.newSession;
				if (newSession?.user) {
					const user = newSession.user;
					console.log('✅ [Auth] User created successfully:', {
						id: user.id,
						username: user.name,
						email: user.email
					});

					// Assign user to default organization and add to league table
					try {
						await assignUserToDefaultOrganization(user.id);
						console.log(`✅ [Auth] User ${user.id} assigned to default organization`);

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
							console.log(`✅ [Auth] User ${user.id} added to league table`);
						}
					} catch (error) {
						console.error(
							`❌ [Auth] Failed to assign user ${user.id} to default organization:`,
							error
						);
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
