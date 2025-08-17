import {
	pgTable,
	text,
	timestamp,
	boolean,
	integer,
	bigint,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';

export const user = pgTable(
	'user',
	{
		id: text('id').primaryKey(),
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
	},
	(table) => ({
		// Indexes for common user queries
		emailIdx: index('user_email_idx').on(table.email),
		roleIdx: index('user_role_idx').on(table.role),
		bannedIdx: index('user_banned_idx').on(table.banned),
		stripeCustomerIdx: index('user_stripe_customer_idx').on(table.stripeCustomerId),
		createdAtIdx: index('user_created_at_idx').on(table.createdAt)
	})
);

export const session = pgTable(
	'session',
	{
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
			.references(() => user.id, { onDelete: 'cascade' }),
		// Organization plugin fields
		activeOrganizationId: text('active_organization_id'),
		activeTeamId: text('active_team_id')
	},
	(table) => ({
		// Indexes for session lookups
		tokenIdx: index('session_token_idx').on(table.token),
		userIdIdx: index('session_user_id_idx').on(table.userId),
		expiresAtIdx: index('session_expires_at_idx').on(table.expiresAt),
		activeOrgIdx: index('session_active_org_idx').on(table.activeOrganizationId),
		ipAddressIdx: index('session_ip_address_idx').on(table.ipAddress)
	})
);

export const account = pgTable('account', {
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

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

// Rate limiting table for Better Auth
export const rateLimit = pgTable('rateLimit', {
	id: text('id').primaryKey(),
	key: text('key').notNull(),
	count: integer('count').default(0).notNull(),
	lastRequest: bigint('lastRequest', { mode: 'number' }).default(0).notNull() // Unix timestamp in seconds
});

// Better Auth Organization Plugin Tables
export const organization = pgTable('organization', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	logo: text('logo'),
	metadata: text('metadata'), // JSON string for additional metadata
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
});

export const member = pgTable(
	'member',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		role: text('role').default('member').notNull(), // owner, admin, member
		createdAt: timestamp('created_at').notNull()
	},
	(table) => ({
		// Composite indexes for membership queries
		userOrgIdx: index('member_user_org_idx').on(table.userId, table.organizationId),
		orgRoleIdx: index('member_org_role_idx').on(table.organizationId, table.role),

		// Individual indexes
		userIdIdx: index('member_user_id_idx').on(table.userId),
		orgIdIdx: index('member_org_id_idx').on(table.organizationId),

		// Unique constraint - one membership per user per org
		userOrgUnique: uniqueIndex('member_user_org_unique').on(table.userId, table.organizationId)
	})
);

export const invitation = pgTable(
	'invitation',
	{
		id: text('id').primaryKey(),
		email: text('email').notNull(),
		inviterId: text('inviter_id')
			.notNull()
			.references(() => user.id),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		role: text('role').default('member').notNull(),
		status: text('status').default('pending').notNull(), // pending, accepted, rejected, cancelled
		expiresAt: timestamp('expires_at').notNull()
	},
	(table) => ({
		// Indexes for invitation queries
		emailIdx: index('invitation_email_idx').on(table.email),
		orgStatusIdx: index('invitation_org_status_idx').on(table.organizationId, table.status),
		inviterIdx: index('invitation_inviter_idx').on(table.inviterId),
		expiresAtIdx: index('invitation_expires_at_idx').on(table.expiresAt),

		// Unique constraint - one pending invitation per email per org
		emailOrgUnique: uniqueIndex('invitation_email_org_unique').on(
			table.email,
			table.organizationId,
			table.status
		)
	})
);

// Type exports
export type AuthUser = typeof user.$inferSelect;
export type AuthSession = typeof session.$inferSelect;
export type AuthAccount = typeof account.$inferSelect;
export type AuthVerification = typeof verification.$inferSelect;
export type RateLimit = typeof rateLimit.$inferSelect;
export type Organization = typeof organization.$inferSelect;
export type Member = typeof member.$inferSelect;
export type Invitation = typeof invitation.$inferSelect;
