import {
	pgTable,
	varchar,
	timestamp,
	boolean,
	integer,
	unique,
	text,
	foreignKey
} from 'drizzle-orm/pg-core';
import { user as authUser } from '../src/lib/server/db/auth/auth-schema';

export const subscriptions = pgTable('subscriptions', {
	id: varchar().primaryKey().notNull(),
	plan: varchar().notNull(),
	referenceId: varchar('reference_id').notNull(),
	stripeCustomerId: varchar('stripe_customer_id'),
	stripeSubscriptionId: varchar('stripe_subscription_id'),
	status: varchar().default('incomplete').notNull(),
	periodStart: timestamp('period_start', { mode: 'string' }),
	periodEnd: timestamp('period_end', { mode: 'string' }),
	cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
	seats: integer().default(10),
	trialStart: timestamp('trial_start', { mode: 'string' }),
	trialEnd: timestamp('trial_end', { mode: 'string' }),
	createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
	updatedAt: timestamp('updated_at', { mode: 'string' }).notNull()
});

// Better Auth Organization Plugin Tables
export const organization = pgTable(
	'organization',
	{
		id: text().primaryKey().notNull(),
		name: text().notNull(),
		slug: text().notNull(),
		logo: text(),
		metadata: text(), // JSON string for additional metadata
		createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).notNull()
	},
	(table) => [unique('organization_slug_unique').on(table.slug)]
);

export const member = pgTable(
	'member',
	{
		id: text().primaryKey().notNull(),
		userId: text('user_id').notNull(),
		organizationId: text('organization_id').notNull(),
		role: text().default('member').notNull(), // owner, admin, member
		createdAt: timestamp('created_at', { mode: 'string' }).notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [authUser.id],
			name: 'member_user_id_auth_user_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: 'member_organization_id_organization_id_fk'
		}).onDelete('cascade'),
		unique('member_user_organization_unique').on(table.userId, table.organizationId)
	]
);

export const invitation = pgTable(
	'invitation',
	{
		id: text().primaryKey().notNull(),
		email: text().notNull(),
		inviterId: text('inviter_id').notNull(),
		organizationId: text('organization_id').notNull(),
		role: text().default('member').notNull(),
		status: text().default('pending').notNull(), // pending, accepted, rejected, cancelled
		expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
		createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.inviterId],
			foreignColumns: [authUser.id],
			name: 'invitation_inviter_id_auth_user_id_fk'
		}),
		foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: 'invitation_organization_id_organization_id_fk'
		}).onDelete('cascade')
	]
);

export const leagueTable = pgTable(
	'league_table',
	{
		id: varchar().primaryKey().notNull(),
		userId: varchar('user_id').notNull(),
		organizationId: varchar('organization_id').notNull(),
		season: varchar().notNull(), // Keep season separation in league tables too
		totalPoints: integer('total_points').default(0).notNull(),
		correctScorelines: integer('correct_scorelines').default(0).notNull(),
		correctOutcomes: integer('correct_outcomes').default(0).notNull(),
		predictedFixtures: integer('predicted_fixtures').default(0),
		completedFixtures: integer('completed_fixtures').default(0),
		lastUpdated: timestamp('last_updated', { mode: 'string' }).notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [authUser.id],
			name: 'league_table_user_id_auth_user_id_fk'
		}),
		foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: 'league_table_organization_id_organization_id_fk'
		}),
		unique('league_table_user_season_unique').on(table.userId, table.season)
	]
);

export const teams = pgTable('teams', {
	id: varchar().primaryKey().notNull(),
	name: varchar().notNull(),
	shortName: varchar('short_name').notNull(),
	logo: varchar()
});

export const fixtures = pgTable(
	'fixtures',
	{
		id: varchar().primaryKey().notNull(),
		matchId: varchar('match_id').notNull(),
		weekId: integer('week_id').notNull(),
		season: varchar().notNull(), // Keep season separation (2024, 2025, etc.)
		homeTeamId: varchar('home_team_id').notNull(),
		awayTeamId: varchar('away_team_id').notNull(),
		homeScore: integer('home_score'),
		awayScore: integer('away_score'),
		matchDate: timestamp('match_date', { mode: 'string' }).notNull(),
		pointsMultiplier: integer('points_multiplier').default(1).notNull(),
		status: varchar().default('TIMED').notNull(),
		lastUpdated: timestamp('last_updated', { mode: 'string' })
	},
	(table) => [
		foreignKey({
			columns: [table.homeTeamId],
			foreignColumns: [teams.id],
			name: 'fixtures_home_team_id_teams_id_fk'
		}),
		foreignKey({
			columns: [table.awayTeamId],
			foreignColumns: [teams.id],
			name: 'fixtures_away_team_id_teams_id_fk'
		})
	]
);

export const predictions = pgTable(
	'predictions',
	{
		id: varchar().primaryKey().notNull(),
		userId: varchar('user_id').notNull(),
		fixtureId: varchar('fixture_id').notNull(),
		predictedHomeScore: integer('predicted_home_score').notNull(),
		predictedAwayScore: integer('predicted_away_score').notNull(),
		points: integer().default(0),
		createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
		organizationId: varchar('organization_id').notNull(),
		season: varchar().default('2025-26').notNull()
	},
	(table) => [
		unique('predictions_user_fixture_org_unique').on(
			table.userId,
			table.fixtureId,
			table.organizationId
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [authUser.id],
			name: 'predictions_user_id_auth_user_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.fixtureId],
			foreignColumns: [fixtures.id],
			name: 'predictions_fixture_id_fixtures_id_fk'
		}),
		foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: 'predictions_organization_id_organization_id_fk'
		})
	]
);
