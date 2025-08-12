import { betterAuth } from 'better-auth';
import { betterAuthOptions } from './betterauth-options';
import { assignUserToDefaultOrganization } from './organization-utils';

// Create and export the auth instance with custom callbacks
export const auth = betterAuth({
	...betterAuthOptions,

	callbacks: {
		user: {
			created: async ({ user }: any) => {
				console.log('✅ [Auth] User created successfully:', {
					id: user.id,
					username: user.username,
					email: user.email
				});

				// Assign user to default organization
				try {
					await assignUserToDefaultOrganization(user.id);
					console.log(`✅ [Auth] User ${user.id} assigned to default organization`);
				} catch (error) {
					console.error(
						`❌ [Auth] Failed to assign user ${user.id} to default organization:`,
						error
					);
				}
			}
		}
	}
});

// Export types
export type Auth = typeof auth;

// Default export for Better Auth auto-discovery
export default auth;
