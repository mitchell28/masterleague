import { pgTable, varchar, integer, timestamp, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user as authUser } from './auth/auth-schema';

export const teams = pgTable('teams', {
	id: varchar('id').primaryKey(),
	name: varchar('name').notNull(),
	shortName: varchar('short_name').notNull(),
	logo: varchar('logo')
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
	status: varchar('status').default('upcoming').notNull() // upcoming, live, completed
});

export const predictions = pgTable('predictions', {
	id: varchar('id').primaryKey(),
	userId: varchar('user_id')
		.notNull()
		.references(() => authUser.id),
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
	totalPoints: integer('total_points').default(0).notNull(),
	correctScorelines: integer('correct_scorelines').default(0).notNull(),
	correctOutcomes: integer('correct_outcomes').default(0).notNull(),
	predictedFixtures: integer('predicted_fixtures').default(0),
	completedFixtures: integer('completed_fixtures').default(0),
	lastUpdated: timestamp('last_updated').notNull()
});

// Relations
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
	fixture: one(fixtures, {
		fields: [predictions.fixtureId],
		references: [fixtures.id]
	})
}));

export const leagueTableRelations = relations(leagueTable, ({ one }) => ({
	user: one(authUser, {
		fields: [leagueTable.userId],
		references: [authUser.id]
	})
}));

// Type exports
export type Team = typeof teams.$inferSelect;
export type Fixture = typeof fixtures.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type LeagueTable = typeof leagueTable.$inferSelect;
