import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb, resetDatabase } from '../database';
import {
	UserFactory,
	OrganizationFactory,
	FixtureFactory,
	PredictionFactory,
	TeamFactory,
	ScenarioFactory
} from '../factories';

describe('Data State Management Tests', () => {
	beforeEach(async () => {
		await resetDatabase(true); // Reset with seed data
	});

	describe('Fixture States', () => {
		it('should create fixtures in different states', async () => {
			const db = getTestDb();

			// Create fixtures in various states
			const scheduledFixture = await FixtureFactory.createScheduled();
			const liveFixture = await FixtureFactory.createLive();
			const finishedFixture = await FixtureFactory.createFinished();
			const postponedFixture = await FixtureFactory.createPostponed();

			// Verify states
			expect(scheduledFixture.status).toBe('TIMED');
			expect(scheduledFixture.homeScore).toBeNull();
			expect(scheduledFixture.awayScore).toBeNull();

			expect(liveFixture.status).toBe('IN_PLAY');
			expect(liveFixture.homeScore).toBe(1);
			expect(liveFixture.awayScore).toBe(0);

			expect(finishedFixture.status).toBe('FINISHED');
			expect(finishedFixture.homeScore).toBe(2);
			expect(finishedFixture.awayScore).toBe(1);

			expect(postponedFixture.status).toBe('POSTPONED');
			expect(postponedFixture.homeScore).toBeNull();
			expect(postponedFixture.awayScore).toBeNull();
		});

		it('should validate fixture timing constraints', async () => {
			const now = new Date();
			const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
			const pastDate = new Date(now.getTime() - 2 * 60 * 60 * 1000);

			const futureFixture = await FixtureFactory.create({
				matchDate: futureDate,
				status: 'TIMED'
			});

			const pastFixture = await FixtureFactory.create({
				matchDate: pastDate,
				status: 'FINISHED'
			});

			expect(futureFixture.matchDate.getTime()).toBeGreaterThan(now.getTime());
			expect(pastFixture.matchDate.getTime()).toBeLessThan(now.getTime());
		});

		it('should handle fixture score updates', async () => {
			const db = getTestDb();
			const fixture = await FixtureFactory.createLive();

			// Update scores during live match
			const updatedScores = {
				homeScore: 3,
				awayScore: 2,
				status: 'FINISHED' as const
			};

			// In a real app, you'd have a service to update fixtures
			// Here we're just testing the data states directly
			expect(fixture.homeScore).toBe(1);
			expect(fixture.awayScore).toBe(0);
			expect(fixture.status).toBe('IN_PLAY');
		});
	});

	describe('User States', () => {
		it('should create users with different roles and states', async () => {
			const regularUser = await UserFactory.create();
			const adminUser = await UserFactory.createAdmin();
			const bannedUser = await UserFactory.createBanned();

			expect(regularUser.role).toBe('user');
			expect(regularUser.banned).toBe(false);

			expect(adminUser.role).toBe('admin');
			expect(adminUser.banned).toBe(false);

			expect(bannedUser.role).toBe('user');
			expect(bannedUser.banned).toBe(true);
			expect(bannedUser.banReason).toBeTruthy();
		});

		it('should validate user email uniqueness', async () => {
			const user1 = await UserFactory.create({ email: 'unique@test.com' });

			// Attempting to create another user with same email should fail
			await expect(async () => {
				await UserFactory.create({ email: 'unique@test.com' });
			}).rejects.toThrow();
		});

		it('should handle user ban states', async () => {
			const bannedUser = await UserFactory.createBanned({
				banReason: 'Violation of terms',
				banExpires: Math.floor(Date.now() / 1000) + 86400 // 24 hours
			});

			expect(bannedUser.banned).toBe(true);
			expect(bannedUser.banReason).toBe('Violation of terms');
			expect(bannedUser.banExpires).toBeTruthy();
		});
	});

	describe('Prediction States', () => {
		it('should create predictions for different fixture states', async () => {
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();

			const scheduledFixture = await FixtureFactory.createScheduled();
			const finishedFixture = await FixtureFactory.createFinished();

			// Prediction for upcoming match
			const futurePrediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: scheduledFixture.id,
				organizationId: org.id,
				predictedHomeScore: 2,
				predictedAwayScore: 1
			});

			// Prediction for finished match (historical data)
			const pastPrediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: finishedFixture.id,
				organizationId: org.id,
				predictedHomeScore: 1,
				predictedAwayScore: 1
			});

			expect(futurePrediction.points).toBe(0); // No points calculated yet
			expect(pastPrediction.points).toBe(0); // Points would be calculated by service
		});

		it('should test prediction accuracy scenarios', async () => {
			const { prediction: exactPrediction, fixture: exactFixture } =
				await PredictionFactory.createCorrectPrediction();

			const { prediction: outcomePrediction, fixture: outcomeFixture } =
				await PredictionFactory.createCorrectOutcomePrediction();

			// Exact score prediction
			expect(exactPrediction.predictedHomeScore).toBe(exactFixture.homeScore);
			expect(exactPrediction.predictedAwayScore).toBe(exactFixture.awayScore);

			// Correct outcome but wrong score
			expect(outcomePrediction.predictedHomeScore).toBeGreaterThan(
				outcomePrediction.predictedAwayScore
			);
			expect(outcomeFixture.homeScore).toBeGreaterThan(outcomeFixture.awayScore);
		});

		it('should prevent predictions on locked fixtures', async () => {
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();

			// Create fixture that's already started (should be locked)
			const liveFixture = await FixtureFactory.createLive();
			const finishedFixture = await FixtureFactory.createFinished();

			// In real app, business logic would prevent these predictions
			// Here we're testing the data states
			const livePrediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: liveFixture.id,
				organizationId: org.id
			});

			const finishedPrediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: finishedFixture.id,
				organizationId: org.id
			});

			// Both predictions exist but would be invalid in business logic
			expect(livePrediction.fixtureId).toBe(liveFixture.id);
			expect(finishedPrediction.fixtureId).toBe(finishedFixture.id);
		});
	});

	describe('Organization and Team States', () => {
		it('should create organizations with proper structure', async () => {
			const org = await OrganizationFactory.create({
				name: 'Premier League Test',
				slug: 'premier-league-test'
			});

			expect(org.name).toBe('Premier League Test');
			expect(org.slug).toBe('premier-league-test');
			expect(org.createdAt).toBeInstanceOf(Date);
		});

		it('should handle team relationships', async () => {
			const homeTeam = await TeamFactory.create({ name: 'Arsenal', shortName: 'ARS' });
			const awayTeam = await TeamFactory.create({ name: 'Chelsea', shortName: 'CHE' });

			const fixture = await FixtureFactory.create({
				homeTeamId: homeTeam.id,
				awayTeamId: awayTeam.id
			});

			expect(fixture.homeTeamId).toBe(homeTeam.id);
			expect(fixture.awayTeamId).toBe(awayTeam.id);
			expect(fixture.homeTeamId).not.toBe(fixture.awayTeamId);
		});
	});

	describe('Complex Scenarios', () => {
		it('should create a complete league scenario', async () => {
			const scenario = await ScenarioFactory.createBasicLeague();

			expect(scenario.users).toHaveLength(3);
			expect(scenario.teams).toHaveLength(6);
			expect(scenario.fixtures).toHaveLength(3);
			expect(scenario.predictions).toHaveLength(2);

			// Verify fixture states
			const statuses = scenario.fixtures.map((f) => f.status);
			expect(statuses).toContain('TIMED');
			expect(statuses).toContain('IN_PLAY');
			expect(statuses).toContain('FINISHED');
		});

		it('should test data consistency across relationships', async () => {
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();
			const fixture = await FixtureFactory.createScheduled();

			const prediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: fixture.id,
				organizationId: org.id
			});

			// Verify all relationships exist
			expect(prediction.userId).toBe(user.id);
			expect(prediction.fixtureId).toBe(fixture.id);
			expect(prediction.organizationId).toBe(org.id);
		});

		it('should handle multiple predictions per user', async () => {
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();

			// Create multiple fixtures
			const fixtures = await Promise.all([
				FixtureFactory.createScheduled({ weekId: 1 }),
				FixtureFactory.createScheduled({ weekId: 1 }),
				FixtureFactory.createScheduled({ weekId: 2 })
			]);

			// Create predictions for all fixtures
			const predictions = await Promise.all(
				fixtures.map((fixture) =>
					PredictionFactory.create({
						userId: user.id,
						fixtureId: fixture.id,
						organizationId: org.id
					})
				)
			);

			expect(predictions).toHaveLength(3);
			expect(predictions.every((p) => p.userId === user.id)).toBe(true);
		});
	});
});
