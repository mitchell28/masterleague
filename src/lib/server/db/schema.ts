import { pgTable, varchar, integer, timestamp, boolean, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user as authUser } from './auth/auth-schema';

export const teams = pgTable('teams', {
	id: varchar('id').primaryKey(),
	name: varchar('name').notNull(),
	shortName: varchar('short_name').notNull(),
	logo: varchar('logo')
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

export const member = pgTable('member', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => authUser.id, { onDelete: 'cascade' }),
	organizationId: text('organization_id')
		.notNull()
		.references(() => organization.id, { onDelete: 'cascade' }),
	role: text('role').default('member').notNull(), // owner, admin, member
	createdAt: timestamp('created_at').notNull()
});

export const invitation = pgTable('invitation', {
	id: text('id').primaryKey(),
	email: text('email').notNull(),
	inviterId: text('inviter_id')
		.notNull()
		.references(() => authUser.id),
	organizationId: text('organization_id')
		.notNull()
		.references(() => organization.id, { onDelete: 'cascade' }),
	role: text('role').default('member').notNull(),
	status: text('status').default('pending').notNull(), // pending, accepted, rejected, cancelled
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
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
	season: varchar('season').notNull(), // Keep season separation (2024, 2025, etc.)
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
	organizationId: varchar('organization_id')
		.notNull()
		.references(() => organization.id), // All predictions now belong to an organization
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
	organizationId: varchar('organization_id')
		.notNull()
		.references(() => organization.id), // League tables are now per organization
	season: varchar('season').notNull(), // Keep season separation in league tables too
	totalPoints: integer('total_points').default(0).notNull(),
	correctScorelines: integer('correct_scorelines').default(0).notNull(),
	correctOutcomes: integer('correct_outcomes').default(0).notNull(),
	predictedFixtures: integer('predicted_fixtures').default(0),
	completedFixtures: integer('completed_fixtures').default(0),
	lastUpdated: timestamp('last_updated').notNull()
});

// Relations
export const organizationRelations = relations(organization, ({ one, many }) => ({
	members: many(member),
	invitations: many(invitation),
	predictions: many(predictions),
	leagueTable: many(leagueTable),
	subscription: one(subscriptions, {
		fields: [organization.id],
		references: [subscriptions.referenceId]
	})
}));

export const memberRelations = relations(member, ({ one }) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id]
	}),
	user: one(authUser, {
		fields: [member.userId],
		references: [authUser.id]
	})
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id]
	}),
	inviter: one(authUser, {
		fields: [invitation.inviterId],
		references: [authUser.id]
	})
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
	organization: one(organization, {
		fields: [subscriptions.referenceId],
		references: [organization.id]
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
	organization: one(organization, {
		fields: [predictions.organizationId],
		references: [organization.id]
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
	organization: one(organization, {
		fields: [leagueTable.organizationId],
		references: [organization.id]
	})
}));

// Type exports
export type Team = typeof teams.$inferSelect;
export type Organization = typeof organization.$inferSelect;
export type Member = typeof member.$inferSelect;
export type Invitation = typeof invitation.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Fixture = typeof fixtures.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type LeagueTable = typeof leagueTable.$inferSelect;
