import { randomUUID } from 'crypto';
import type { InferInsertModel } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { user as authUser } from '$lib/server/db/auth/auth-schema';
import { getTestDb } from './database';

export type UserInsert = InferInsertModel<typeof authUser>;
export type OrganizationInsert = InferInsertModel<typeof schema.organization>;
export type FixtureInsert = InferInsertModel<typeof schema.fixtures>;
export type PredictionInsert = InferInsertModel<typeof schema.predictions>;
export type TeamInsert = InferInsertModel<typeof schema.teams>;
export type LeagueTableInsert = InferInsertModel<typeof schema.leagueTable>;

/**
 * Factory for creating test users
 */
export class UserFactory {
	static async create(overrides: Partial<UserInsert> = {}): Promise<UserInsert> {
		const db = getTestDb();
		const id = randomUUID();
		const timestamp = new Date();

		const user: UserInsert = {
			id,
			name: `Test User ${id.slice(0, 8)}`,
			email: `test-${id.slice(0, 8)}@example.com`,
			emailVerified: true,
			image: null,
			createdAt: timestamp,
			updatedAt: timestamp,
			role: 'user',
			banned: false,
			banReason: null,
			banExpires: null,
			stripeCustomerId: null,
			...overrides
		};

		await db.insert(authUser).values(user);
		return user;
	}

	static async createBanned(overrides: Partial<UserInsert> = {}): Promise<UserInsert> {
		return this.create({
			banned: true,
			banReason: 'Test ban reason',
			banExpires: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
			...overrides
		});
	}

	static async createAdmin(overrides: Partial<UserInsert> = {}): Promise<UserInsert> {
		return this.create({
			role: 'admin',
			...overrides
		});
	}
}

/**
 * Factory for creating test organizations
 */
export class OrganizationFactory {
	static async create(overrides: Partial<OrganizationInsert> = {}): Promise<OrganizationInsert> {
		const db = getTestDb();
		const id = randomUUID();
		const timestamp = new Date();

		const organization: OrganizationInsert = {
			id,
			name: `Test Organization ${id.slice(0, 8)}`,
			slug: `test-org-${id.slice(0, 8)}`,
			logo: null,
			metadata: null,
			createdAt: timestamp,
			updatedAt: timestamp,
			...overrides
		};

		await db.insert(schema.organization).values(organization);
		return organization;
	}
}

/**
 * Factory for creating test teams
 */
export class TeamFactory {
	static async create(overrides: Partial<TeamInsert> = {}): Promise<TeamInsert> {
		const db = getTestDb();
		const id = randomUUID().slice(0, 8);

		const team: TeamInsert = {
			id,
			name: `Test Team ${id}`,
			shortName: id.toUpperCase().slice(0, 3),
			logo: null,
			...overrides
		};

		await db.insert(schema.teams).values(team);
		return team;
	}

	// Create a batch of teams for testing
	static async createBatch(count: number): Promise<TeamInsert[]> {
		const teams: TeamInsert[] = [];
		for (let i = 0; i < count; i++) {
			teams.push(await this.create());
		}
		return teams;
	}
}

/**
 * Factory for creating test fixtures
 */
export class FixtureFactory {
	static async create(overrides: Partial<FixtureInsert> = {}): Promise<FixtureInsert> {
		const db = getTestDb();
		const id = randomUUID();

		// Get random teams for home and away if not provided
		let homeTeamId = overrides.homeTeamId;
		let awayTeamId = overrides.awayTeamId;

		if (!homeTeamId || !awayTeamId) {
			const teams = await db.select().from(schema.teams).limit(2);
			if (teams.length < 2) {
				// Create teams if none exist
				const createdTeams = await TeamFactory.createBatch(2);
				homeTeamId = homeTeamId || createdTeams[0].id;
				awayTeamId = awayTeamId || createdTeams[1].id;
			} else {
				homeTeamId = homeTeamId || teams[0].id;
				awayTeamId = awayTeamId || teams[1].id;
			}
		}

		const fixture: FixtureInsert = {
			id,
			matchId: `match-${id.slice(0, 8)}`,
			weekId: 1,
			season: '2025-26',
			homeTeamId,
			awayTeamId,
			homeScore: null,
			awayScore: null,
			matchDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
			pointsMultiplier: 1,
			status: 'TIMED',
			lastUpdated: null,
			...overrides
		};

		await db.insert(schema.fixtures).values(fixture);
		return fixture;
	}

	// Create fixture in different states
	static async createScheduled(overrides: Partial<FixtureInsert> = {}): Promise<FixtureInsert> {
		return this.create({
			status: 'TIMED',
			matchDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
			homeScore: null,
			awayScore: null,
			...overrides
		});
	}

	static async createLive(overrides: Partial<FixtureInsert> = {}): Promise<FixtureInsert> {
		return this.create({
			status: 'IN_PLAY',
			matchDate: new Date(),
			homeScore: 1,
			awayScore: 0,
			...overrides
		});
	}

	static async createFinished(overrides: Partial<FixtureInsert> = {}): Promise<FixtureInsert> {
		return this.create({
			status: 'FINISHED',
			matchDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
			homeScore: 2,
			awayScore: 1,
			...overrides
		});
	}

	static async createPostponed(overrides: Partial<FixtureInsert> = {}): Promise<FixtureInsert> {
		return this.create({
			status: 'POSTPONED',
			matchDate: new Date(),
			homeScore: null,
			awayScore: null,
			...overrides
		});
	}
}

/**
 * Factory for creating test predictions
 */
export class PredictionFactory {
	static async create(overrides: Partial<PredictionInsert> = {}): Promise<PredictionInsert> {
		const db = getTestDb();
		const id = randomUUID();

		// Get user and fixture if not provided
		let userId = overrides.userId;
		let fixtureId = overrides.fixtureId;
		let organizationId = overrides.organizationId;

		if (!userId) {
			const user = await UserFactory.create();
			userId = user.id;
		}

		if (!fixtureId) {
			const fixture = await FixtureFactory.createScheduled();
			fixtureId = fixture.id;
		}

		if (!organizationId) {
			organizationId = 'test-org'; // Use default test org
		}

		const prediction: PredictionInsert = {
			id,
			userId: userId!,
			fixtureId,
			predictedHomeScore: 2,
			predictedAwayScore: 1,
			points: 0,
			createdAt: new Date(),
			organizationId,
			...overrides
		};

		await db.insert(schema.predictions).values(prediction);
		return prediction;
	}

	// Create prediction that will earn points
	static async createCorrectPrediction(
		fixtureOverrides: Partial<FixtureInsert> = {}
	): Promise<{ prediction: PredictionInsert; fixture: FixtureInsert }> {
		const fixture = await FixtureFactory.createFinished({
			homeScore: 2,
			awayScore: 1,
			...fixtureOverrides
		});

		const prediction = await this.create({
			fixtureId: fixture.id,
			predictedHomeScore: 2,
			predictedAwayScore: 1,
			points: 5 // Exact score = 5 points
		});

		return { prediction, fixture };
	}

	// Create prediction with correct outcome but wrong score
	static async createCorrectOutcomePrediction(
		fixtureOverrides: Partial<FixtureInsert> = {}
	): Promise<{ prediction: PredictionInsert; fixture: FixtureInsert }> {
		const fixture = await FixtureFactory.createFinished({
			homeScore: 3,
			awayScore: 1,
			...fixtureOverrides
		});

		const prediction = await this.create({
			fixtureId: fixture.id,
			predictedHomeScore: 2,
			predictedAwayScore: 0,
			points: 3 // Correct outcome = 3 points
		});

		return { prediction, fixture };
	}
}

/**
 * Create a complete test scenario with users, organizations, fixtures, and predictions
 */
export class ScenarioFactory {
	static async createBasicLeague() {
		// Create organization
		const org = await OrganizationFactory.create();

		// Create users
		const users = await Promise.all([
			UserFactory.create(),
			UserFactory.create(),
			UserFactory.create()
		]);

		// Create teams
		const teams = await TeamFactory.createBatch(6);

		// Create fixtures for current week
		const fixtures = await Promise.all([
			FixtureFactory.createScheduled({
				homeTeamId: teams[0].id,
				awayTeamId: teams[1].id,
				weekId: 1
			}),
			FixtureFactory.createLive({
				homeTeamId: teams[2].id,
				awayTeamId: teams[3].id,
				weekId: 1
			}),
			FixtureFactory.createFinished({
				homeTeamId: teams[4].id,
				awayTeamId: teams[5].id,
				weekId: 1
			})
		]);

		// Create some predictions
		const predictions = await Promise.all([
			PredictionFactory.create({
				userId: users[0].id,
				fixtureId: fixtures[0].id,
				organizationId: org.id
			}),
			PredictionFactory.create({
				userId: users[1].id,
				fixtureId: fixtures[0].id,
				organizationId: org.id
			})
		]);

		return {
			organization: org,
			users,
			teams,
			fixtures,
			predictions
		};
	}
}

/**
 * Factory for creating league table entries
 */
export class LeagueTableFactory {
	static async create(overrides: Partial<LeagueTableInsert> = {}): Promise<LeagueTableInsert> {
		const db = getTestDb();
		const id = randomUUID();

		const leagueTableEntry: LeagueTableInsert = {
			id,
			userId: randomUUID(),
			organizationId: randomUUID(),
			season: '2024/25',
			totalPoints: 0,
			correctScorelines: 0,
			correctOutcomes: 0,
			predictedFixtures: 0,
			completedFixtures: 0,
			lastUpdated: new Date(),
			...overrides
		};

		await db.insert(schema.leagueTable).values(leagueTableEntry);
		return leagueTableEntry;
	}

	static async createWithStats(
		userId: string,
		organizationId: string,
		stats: {
			totalPoints?: number;
			correctScorelines?: number;
			correctOutcomes?: number;
			predictedFixtures?: number;
			completedFixtures?: number;
		} = {}
	): Promise<LeagueTableInsert> {
		return this.create({
			userId,
			organizationId,
			totalPoints: stats.totalPoints || 0,
			correctScorelines: stats.correctScorelines || 0,
			correctOutcomes: stats.correctOutcomes || 0,
			predictedFixtures: stats.predictedFixtures || 0,
			completedFixtures: stats.completedFixtures || 0
		});
	}

	static async createBatch(
		count: number,
		organizationId: string,
		overrides: Partial<LeagueTableInsert> = {}
	): Promise<LeagueTableInsert[]> {
		const entries = [];
		for (let i = 0; i < count; i++) {
			const user = await UserFactory.create();
			entries.push(
				await this.create({
					userId: user.id,
					organizationId,
					totalPoints: Math.floor(Math.random() * 100),
					correctScorelines: Math.floor(Math.random() * 20),
					correctOutcomes: Math.floor(Math.random() * 50),
					predictedFixtures: Math.floor(Math.random() * 30) + 10,
					completedFixtures: Math.floor(Math.random() * 25) + 5,
					...overrides
				})
			);
		}
		return entries;
	}
}
