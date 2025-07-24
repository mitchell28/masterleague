import { pgTable, varchar, integer, timestamp, boolean, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user as authUser } from './auth/auth-schema';

export const teams = pgTable('teams', {
	id: varchar('id').primaryKey(),
	name: varchar('name').notNull(),
	shortName: varchar('short_name').notNull(),
	logo: varchar('logo')
});

// Groups for subscription management
export const groups = pgTable('groups', {
	id: varchar('id').primaryKey(),
	name: varchar('name').notNull(),
	description: text('description'),
	ownerId: varchar('owner_id')
		.notNull()
		.references(() => authUser.id),
	maxMembers: integer('max_members').default(10).notNull(),
	isActive: boolean('is_active').default(true).notNull(),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
});

// Group invite codes (multiple per group)
export const groupInviteCodes = pgTable('group_invite_codes', {
	id: varchar('id').primaryKey(),
	groupId: varchar('group_id')
		.notNull()
		.references(() => groups.id, { onDelete: 'cascade' }),
	code: varchar('code').unique().notNull(),
	createdBy: varchar('created_by')
		.notNull()
		.references(() => authUser.id),
	usedBy: varchar('used_by').references(() => authUser.id),
	createdAt: timestamp('created_at').notNull(),
	usedAt: timestamp('used_at'),
	expiresAt: timestamp('expires_at'), // Optional expiration
	isActive: boolean('is_active').default(true).notNull()
});

// Group memberships
export const groupMemberships = pgTable('group_memberships', {
	id: varchar('id').primaryKey(),
	groupId: varchar('group_id')
		.notNull()
		.references(() => groups.id, { onDelete: 'cascade' }),
	userId: varchar('user_id')
		.notNull()
		.references(() => authUser.id, { onDelete: 'cascade' }),
	role: varchar('role').default('member').notNull(), // 'owner', 'admin', 'member'
	joinedAt: timestamp('joined_at').notNull(),
	isActive: boolean('is_active').default(true).notNull()
});

// Stripe subscriptions
export const subscriptions = pgTable('subscriptions', {
	id: varchar('id').primaryKey(),
	plan: varchar('plan').notNull(),
	referenceId: varchar('reference_id').notNull(), // group ID
	stripeCustomerId: varchar('stripe_customer_id'),
	stripeSubscriptionId: varchar('stripe_subscription_id'),
	status: varchar('status').default('incomplete').notNull(),
	periodStart: timestamp('period_start'),
	periodEnd: timestamp('period_end'),
	cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
	seats: integer('seats').default(10),
	trialStart: timestamp('trial_start'),
	trialEnd: timestamp('trial_end'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
});

export const fixtures = pgTable('fixtures', {
	id: varchar('id').primaryKey(),
	matchId: varchar('match_id').notNull(),
	weekId: integer('week_id').notNull(),
	homeTeamId: varchar('home_team_id')
		.notNull()
		.references(() => teams.id),
	awayTeamId: varchar('away_team_id')
		.notNull()
		.references(() => teams.id),
	homeScore: integer('home_score'),
	awayScore: integer('away_score'),
	matchDate: timestamp('match_date').notNull(),
	pointsMultiplier: integer('points_multiplier').default(1).notNull(),
	status: varchar('status').default('TIMED').notNull(), // Valid values: SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, SUSPENDED, POSTPONED, CANCELLED, AWARDED
	lastUpdated: timestamp('last_updated')
});

export const predictions = pgTable('predictions', {
	id: varchar('id').primaryKey(),
	userId: varchar('user_id')
		.notNull()
		.references(() => authUser.id),
	groupId: varchar('group_id')
		.notNull()
		.references(() => groups.id), // All predictions now belong to a group
	fixtureId: varchar('fixture_id')
		.notNull()
		.references(() => fixtures.id),
	predictedHomeScore: integer('predicted_home_score').notNull(),
	predictedAwayScore: integer('predicted_away_score').notNull(),
	points: integer('points').default(0),
	createdAt: timestamp('created_at').notNull()
});

export const leagueTable = pgTable('league_table', {
	id: varchar('id').primaryKey(),
	userId: varchar('user_id')
		.notNull()
		.references(() => authUser.id),
	groupId: varchar('group_id')
		.notNull()
		.references(() => groups.id), // League tables are now per group
	totalPoints: integer('total_points').default(0).notNull(),
	correctScorelines: integer('correct_scorelines').default(0).notNull(),
	correctOutcomes: integer('correct_outcomes').default(0).notNull(),
	predictedFixtures: integer('predicted_fixtures').default(0),
	completedFixtures: integer('completed_fixtures').default(0),
	lastUpdated: timestamp('last_updated').notNull()
});

// Relations
export const groupsRelations = relations(groups, ({ one, many }) => ({
	owner: one(authUser, {
		fields: [groups.ownerId],
		references: [authUser.id]
	}),
	memberships: many(groupMemberships),
	inviteCodes: many(groupInviteCodes),
	predictions: many(predictions),
	leagueTable: many(leagueTable),
	subscription: one(subscriptions, {
		fields: [groups.id],
		references: [subscriptions.referenceId]
	})
}));

export const groupInviteCodesRelations = relations(groupInviteCodes, ({ one }) => ({
	group: one(groups, {
		fields: [groupInviteCodes.groupId],
		references: [groups.id]
	}),
	creator: one(authUser, {
		fields: [groupInviteCodes.createdBy],
		references: [authUser.id]
	}),
	user: one(authUser, {
		fields: [groupInviteCodes.usedBy],
		references: [authUser.id]
	})
}));

export const groupMembershipsRelations = relations(groupMemberships, ({ one }) => ({
	group: one(groups, {
		fields: [groupMemberships.groupId],
		references: [groups.id]
	}),
	user: one(authUser, {
		fields: [groupMemberships.userId],
		references: [authUser.id]
	})
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
	group: one(groups, {
		fields: [subscriptions.referenceId],
		references: [groups.id]
	})
}));

export const fixturesRelations = relations(fixtures, ({ one, many }) => ({
	homeTeam: one(teams, {
		fields: [fixtures.homeTeamId],
		references: [teams.id]
	}),
	awayTeam: one(teams, {
		fields: [fixtures.awayTeamId],
		references: [teams.id]
	}),
	predictions: many(predictions)
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
	user: one(authUser, {
		fields: [predictions.userId],
		references: [authUser.id]
	}),
	group: one(groups, {
		fields: [predictions.groupId],
		references: [groups.id]
	}),
	fixture: one(fixtures, {
		fields: [predictions.fixtureId],
		references: [fixtures.id]
	})
}));

export const leagueTableRelations = relations(leagueTable, ({ one }) => ({
	user: one(authUser, {
		fields: [leagueTable.userId],
		references: [authUser.id]
	}),
	group: one(groups, {
		fields: [leagueTable.groupId],
		references: [groups.id]
	})
}));

// Type exports
export type Team = typeof teams.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMembership = typeof groupMemberships.$inferSelect;
export type GroupInviteCode = typeof groupInviteCodes.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Fixture = typeof fixtures.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type LeagueTable = typeof leagueTable.$inferSelect;
