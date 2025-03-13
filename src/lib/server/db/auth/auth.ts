import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { db } from '../index';

// Create and export the auth instance
export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg' // PostgreSQL
	}),

	// Enable email and password authentication
	emailAndPassword: {
		enabled: true,
		autoSignIn: true
	},

	plugins: [
		admin({
			adminRoles: ['admin'] // Roles that have admin access
		})
	]
});

// Export types
export type Auth = typeof auth;
