import {
	pgTable,
	varchar,
	integer,
	timestamp,
	boolean,
	text,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { user as authUser, organization, member, invitation } from './auth/auth-schema';

export const teams = pgTable('teams', {
	id: varchar('id').primaryKey(),
	name: varchar('name').notNull(),
	shortName: varchar('short_name').notNull(),
	logo: varchar('logo')
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

export const fixtures = pgTable(
	'fixtures',
	{
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
	},
	(table) => ({
		// Composite indexes for common query patterns
		seasonStatusIdx: index('fixtures_season_status_idx').on(table.season, table.status),
		seasonWeekIdx: index('fixtures_season_week_idx').on(table.season, table.weekId),
		statusMatchDateIdx: index('fixtures_status_match_date_idx').on(table.status, table.matchDate),

		// Individual indexes for foreign keys and filters
		homeTeamSeasonIdx: index('fixtures_home_team_season_idx').on(table.homeTeamId, table.season),
		awayTeamSeasonIdx: index('fixtures_away_team_season_idx').on(table.awayTeamId, table.season),
		matchDateIdx: index('fixtures_match_date_idx').on(table.matchDate),
		lastUpdatedIdx: index('fixtures_last_updated_idx').on(table.lastUpdated),

		// Unique constraint on external match ID
		matchIdUnique: uniqueIndex('fixtures_match_id_unique').on(table.matchId)
	})
);

export const predictions = pgTable(
	'predictions',
	{
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
	},
	(table) => ({
		// Composite indexes for common query patterns
		userOrgIdx: index('predictions_user_org_idx').on(table.userId, table.organizationId),
		orgFixtureIdx: index('predictions_org_fixture_idx').on(table.organizationId, table.fixtureId),
		userFixtureIdx: index('predictions_user_fixture_idx').on(table.userId, table.fixtureId),

		// Weekly stats optimization - user, org, and creation time for recent predictions
		userOrgWeekIdx: index('predictions_user_org_week_idx').on(
			table.userId,
			table.organizationId,
			table.createdAt
		),

		// Individual indexes
		fixtureIdIdx: index('predictions_fixture_id_idx').on(table.fixtureId),
		pointsIdx: index('predictions_points_idx').on(table.points),
		createdAtIdx: index('predictions_created_at_idx').on(table.createdAt),

		// Unique constraint - one prediction per user per fixture
		userFixtureUnique: uniqueIndex('predictions_user_fixture_unique').on(
			table.userId,
			table.fixtureId
		)
	})
);

export const leagueTable = pgTable(
	'league_table',
	{
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
	},
	(table) => ({
		// Composite indexes for leaderboard queries
		orgSeasonPointsIdx: index('league_table_org_season_points_idx').on(
			table.organizationId,
			table.season,
			table.totalPoints.desc()
		),
		userOrgSeasonIdx: index('league_table_user_org_season_idx').on(
			table.userId,
			table.organizationId,
			table.season
		),

		// Individual indexes
		totalPointsIdx: index('league_table_total_points_idx').on(table.totalPoints.desc()),
		lastUpdatedIdx: index('league_table_last_updated_idx').on(table.lastUpdated),

		// Unique constraint - one entry per user per org per season
		userOrgSeasonUnique: uniqueIndex('league_table_user_org_season_unique').on(
			table.userId,
			table.organizationId,
			table.season
		)
	})
);

export const leaderboardMeta = pgTable(
	'leaderboard_meta',
	{
		id: varchar('id').primaryKey(),
		organizationId: varchar('organization_id')
			.notNull()
			.references(() => organization.id),
		season: varchar('season').notNull(),
		lastLeaderboardUpdate: timestamp('last_leaderboard_update').notNull(),
		lastGameTime: timestamp('last_game_time'), // Most recent finished match timestamp
		isLocked: boolean('is_locked').default(false).notNull(),
		lockExpiry: timestamp('lock_expiry'),
		totalMatches: integer('total_matches').default(0).notNull(),
		finishedMatches: integer('finished_matches').default(0).notNull(),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at').notNull()
	},
	(table) => ({
		// Composite indexes for metadata lookups
		orgSeasonIdx: index('leaderboard_meta_org_season_idx').on(table.organizationId, table.season),

		// Individual indexes
		lastUpdateIdx: index('leaderboard_meta_last_update_idx').on(table.lastLeaderboardUpdate),
		lastGameTimeIdx: index('leaderboard_meta_last_game_time_idx').on(table.lastGameTime),
		lockExpiryIdx: index('leaderboard_meta_lock_expiry_idx').on(table.lockExpiry),

		// Unique constraint - one metadata entry per org per season
		orgSeasonUnique: uniqueIndex('leaderboard_meta_org_season_unique').on(
			table.organizationId,
			table.season
		)
	})
);

// Relations
export const organizationRelations = relations(organization, ({ one, many }) => ({
	members: many(member),
	invitations: many(invitation),
	predictions: many(predictions),
	leagueTable: many(leagueTable),
	leaderboardMeta: many(leaderboardMeta),
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

export const leaderboardMetaRelations = relations(leaderboardMeta, ({ one }) => ({
	organization: one(organization, {
		fields: [leaderboardMeta.organizationId],
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
export type LeaderboardMeta = typeof leaderboardMeta.$inferSelect;
