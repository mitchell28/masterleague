import { relations } from 'drizzle-orm/relations';
import {
	authUser,
	organization,
	member,
	invitation,
	leagueTable,
	authAccount,
	authSession,
	teams,
	fixtures,
	predictions
} from './schema';

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	invitations: many(invitation),
	leagueTables: many(leagueTable),
	predictions: many(predictions)
}));

export const authUserRelations = relations(authUser, ({ many }) => ({
	memberships: many(member),
	sentInvitations: many(invitation, {
		relationName: 'invitation_inviter_id_auth_user_id'
	}),
	leagueTables: many(leagueTable),
	authAccounts: many(authAccount),
	authSessions: many(authSession),
	predictions: many(predictions)
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
		references: [authUser.id],
		relationName: 'invitation_inviter_id_auth_user_id'
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

export const authAccountRelations = relations(authAccount, ({ one }) => ({
	user: one(authUser, {
		fields: [authAccount.userId],
		references: [authUser.id]
	})
}));

export const authSessionRelations = relations(authSession, ({ one }) => ({
	user: one(authUser, {
		fields: [authSession.userId],
		references: [authUser.id]
	})
}));

export const fixturesRelations = relations(fixtures, ({ one, many }) => ({
	team_homeTeamId: one(teams, {
		fields: [fixtures.homeTeamId],
		references: [teams.id],
		relationName: 'fixtures_homeTeamId_teams_id'
	}),
	team_awayTeamId: one(teams, {
		fields: [fixtures.awayTeamId],
		references: [teams.id],
		relationName: 'fixtures_awayTeamId_teams_id'
	}),
	predictions: many(predictions)
}));

export const teamsRelations = relations(teams, ({ many }) => ({
	fixtures_homeTeamId: many(fixtures, {
		relationName: 'fixtures_homeTeamId_teams_id'
	}),
	fixtures_awayTeamId: many(fixtures, {
		relationName: 'fixtures_awayTeamId_teams_id'
	})
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
	user: one(authUser, {
		fields: [predictions.userId],
		references: [authUser.id]
	}),
	fixture: one(fixtures, {
		fields: [predictions.fixtureId],
		references: [fixtures.id]
	}),
	organization: one(organization, {
		fields: [predictions.organizationId],
		references: [organization.id]
	})
}));
