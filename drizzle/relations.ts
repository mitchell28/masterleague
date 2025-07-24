import { relations } from "drizzle-orm/relations";
import { authUser, groups, groupMemberships, groupInviteCodes, leagueTable, authAccount, authSession, teams, fixtures, predictions } from "./schema";

export const groupsRelations = relations(groups, ({one, many}) => ({
	authUser: one(authUser, {
		fields: [groups.ownerId],
		references: [authUser.id]
	}),
	groupMemberships: many(groupMemberships),
	groupInviteCodes: many(groupInviteCodes),
	leagueTables: many(leagueTable),
	predictions: many(predictions),
}));

export const authUserRelations = relations(authUser, ({many}) => ({
	groups: many(groups),
	groupMemberships: many(groupMemberships),
	groupInviteCodes_createdBy: many(groupInviteCodes, {
		relationName: "groupInviteCodes_createdBy_authUser_id"
	}),
	groupInviteCodes_usedBy: many(groupInviteCodes, {
		relationName: "groupInviteCodes_usedBy_authUser_id"
	}),
	leagueTables: many(leagueTable),
	authAccounts: many(authAccount),
	authSessions: many(authSession),
	predictions: many(predictions),
}));

export const groupMembershipsRelations = relations(groupMemberships, ({one}) => ({
	group: one(groups, {
		fields: [groupMemberships.groupId],
		references: [groups.id]
	}),
	authUser: one(authUser, {
		fields: [groupMemberships.userId],
		references: [authUser.id]
	}),
}));

export const groupInviteCodesRelations = relations(groupInviteCodes, ({one}) => ({
	group: one(groups, {
		fields: [groupInviteCodes.groupId],
		references: [groups.id]
	}),
	authUser_createdBy: one(authUser, {
		fields: [groupInviteCodes.createdBy],
		references: [authUser.id],
		relationName: "groupInviteCodes_createdBy_authUser_id"
	}),
	authUser_usedBy: one(authUser, {
		fields: [groupInviteCodes.usedBy],
		references: [authUser.id],
		relationName: "groupInviteCodes_usedBy_authUser_id"
	}),
}));

export const leagueTableRelations = relations(leagueTable, ({one}) => ({
	authUser: one(authUser, {
		fields: [leagueTable.userId],
		references: [authUser.id]
	}),
	group: one(groups, {
		fields: [leagueTable.groupId],
		references: [groups.id]
	}),
}));

export const authAccountRelations = relations(authAccount, ({one}) => ({
	authUser: one(authUser, {
		fields: [authAccount.userId],
		references: [authUser.id]
	}),
}));

export const authSessionRelations = relations(authSession, ({one}) => ({
	authUser: one(authUser, {
		fields: [authSession.userId],
		references: [authUser.id]
	}),
}));

export const fixturesRelations = relations(fixtures, ({one, many}) => ({
	team_homeTeamId: one(teams, {
		fields: [fixtures.homeTeamId],
		references: [teams.id],
		relationName: "fixtures_homeTeamId_teams_id"
	}),
	team_awayTeamId: one(teams, {
		fields: [fixtures.awayTeamId],
		references: [teams.id],
		relationName: "fixtures_awayTeamId_teams_id"
	}),
	predictions: many(predictions),
}));

export const teamsRelations = relations(teams, ({many}) => ({
	fixtures_homeTeamId: many(fixtures, {
		relationName: "fixtures_homeTeamId_teams_id"
	}),
	fixtures_awayTeamId: many(fixtures, {
		relationName: "fixtures_awayTeamId_teams_id"
	}),
}));

export const predictionsRelations = relations(predictions, ({one}) => ({
	authUser: one(authUser, {
		fields: [predictions.userId],
		references: [authUser.id]
	}),
	fixture: one(fixtures, {
		fields: [predictions.fixtureId],
		references: [fixtures.id]
	}),
	group: one(groups, {
		fields: [predictions.groupId],
		references: [groups.id]
	}),
}));