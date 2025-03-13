import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { env } from '$env/dynamic/private';
import { db } from '../index';

// Create and export the auth instance
export const auth = betterAuth({
	// Core configuration
	secret: env.BETTER_AUTH_SECRET || 'your-secret-key-here-change-this-in-production',
	baseUrl: env.BETTER_AUTH_URL || 'http://localhost:5173',

	// Use the drizzle adapter - this is the recommended approach when using Drizzle ORM
	database: drizzleAdapter(db, {
		provider: 'pg' // PostgreSQL
		// The schema is automatically detected from the db instance
		// The adapter maps the tables correctly without manual configuration
	}),

	// Enable email and password authentication
	emailAndPassword: {
		enabled: true,
		autoSignIn: true
	},

	// Add the admin plugin
	plugins: [
		admin({
			// Configure admin options
			adminRoles: ['admin'] // Roles that have admin access
		})
	]
});

// Export types
export type Auth = typeof auth;
