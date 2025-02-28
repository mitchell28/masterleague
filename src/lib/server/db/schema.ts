import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	role: text('role').default('user').notNull()
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const teams = sqliteTable('teams', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	shortName: text('short_name').notNull(),
	logo: text('logo')
});

export const fixtures = sqliteTable('fixtures', {
	id: text('id').primaryKey(),
	weekId: integer('week_id').notNull(),
	homeTeamId: text('home_team_id')
		.notNull()
		.references(() => teams.id),
	awayTeamId: text('away_team_id')
		.notNull()
		.references(() => teams.id),
	homeScore: integer('home_score'),
	awayScore: integer('away_score'),
	matchDate: integer('match_date', { mode: 'timestamp' }).notNull(),
	pointsMultiplier: integer('points_multiplier').default(1).notNull(),
	status: text('status').default('upcoming').notNull() // upcoming, live, completed
});

export const predictions = sqliteTable('predictions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	fixtureId: text('fixture_id')
		.notNull()
		.references(() => fixtures.id),
	predictedHomeScore: integer('predicted_home_score').notNull(),
	predictedAwayScore: integer('predicted_away_score').notNull(),
	points: integer('points').default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const leagueTable = sqliteTable('league_table', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	totalPoints: integer('total_points').default(0).notNull(),
	correctScorelines: integer('correct_scorelines').default(0).notNull(),
	correctOutcomes: integer('correct_outcomes').default(0).notNull(),
	lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull()
});

// Relations
export const userRelations = relations(user, ({ many }) => ({
	predictions: many(predictions),
	leagueEntry: many(leagueTable)
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
	user: one(user, {
		fields: [predictions.userId],
		references: [user.id]
	}),
	fixture: one(fixtures, {
		fields: [predictions.fixtureId],
		references: [fixtures.id]
	})
}));

export const leagueTableRelations = relations(leagueTable, ({ one }) => ({
	user: one(user, {
		fields: [leagueTable.userId],
		references: [user.id]
	})
}));

// Type exports
export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Fixture = typeof fixtures.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type LeagueTable = typeof leagueTable.$inferSelect;
