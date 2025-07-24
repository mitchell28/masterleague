import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

// Prefix auth tables with 'auth_' to avoid conflicts
export const user = pgTable('auth_user', {
	id: text('id').primaryKey(),
	username: text('username').unique(),
	displayUsername: text('display_name'),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull(),
	image: text('image'),
	// Admin plugin fields
	role: text('role').default('user'), // The user's role - defaults to 'user', admins will have 'admin'
	banned: boolean('banned').default(false), // Whether the user is banned
	banReason: text('ban_reason'), // Reason for the ban
	banExpires: integer('ban_expires'), // Unix timestamp when the ban expires
	// Stripe plugin field
	stripeCustomerId: text('stripe_customer_id'),
	// Timestamps
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
});

export const session = pgTable('auth_session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	// Admin plugin field
	impersonatedBy: text('impersonated_by'), // ID of admin impersonating this session
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
});

export const account = pgTable('auth_account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable('auth_verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

// Type exports
export type AuthUser = typeof user.$inferSelect;
export type AuthSession = typeof session.$inferSelect;
export type AuthAccount = typeof account.$inferSelect;
export type AuthVerification = typeof verification.$inferSelect;
