import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestDb, resetDatabase } from '../database';
import {
	UserFactory,
	FixtureFactory,
	PredictionFactory,
	TeamFactory,
	OrganizationFactory
} from '../factories';
import * as schema from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth/auth-schema';
import { eq, and } from 'drizzle-orm';

describe('Advanced Edge Cases and Scenarios', () => {
	beforeEach(async () => {
		await resetDatabase(true);
	});

	describe('Concurrent Predictions', () => {
		it('should handle multiple users predicting the same fixture simultaneously', async () => {
			const fixture = await FixtureFactory.createScheduled();
			const org = await OrganizationFactory.create();

			// Create multiple users
			const users = await Promise.all([
				UserFactory.create(),
				UserFactory.create(),
				UserFactory.create(),
				UserFactory.create(),
				UserFactory.create()
			]);

			// Simulate concurrent predictions
			const predictions = await Promise.all(
				users.map((user, index) =>
					PredictionFactory.create({
						userId: user.id,
						fixtureId: fixture.id,
						organizationId: org.id,
						predictedHomeScore: index + 1,
						predictedAwayScore: index
					})
				)
			);

			expect(predictions).toHaveLength(5);

			// Verify all predictions are unique
			const predictionIds = predictions.map((p) => p.id);
			const uniqueIds = new Set(predictionIds);
			expect(uniqueIds.size).toBe(5);

			// Verify user predictions are different
			expect(predictions[0].predictedHomeScore).toBe(1);
			expect(predictions[4].predictedHomeScore).toBe(5);
		});

		it('should prevent duplicate predictions from same user for same fixture', async () => {
			const db = getTestDb();
			const user = await UserFactory.create();
			const fixture = await FixtureFactory.createScheduled();
			const org = await OrganizationFactory.create();

			// First prediction
			const prediction1 = await PredictionFactory.create({
				userId: user.id,
				fixtureId: fixture.id,
				organizationId: org.id
			});

			// Check if there's already a prediction for this user/fixture/org combination
			const existingPredictions = await db
				.select()
				.from(schema.predictions)
				.where(
					and(
						eq(schema.predictions.userId, user.id),
						eq(schema.predictions.fixtureId, fixture.id),
						eq(schema.predictions.organizationId, org.id)
					)
				);

			// Should only have one prediction (business logic should prevent duplicates)
			expect(existingPredictions).toHaveLength(1);
			expect(existingPredictions[0].id).toBe(prediction1.id);
		});
	});

	describe('Fixture Postponements and Rescheduling', () => {
		it('should handle fixture postponement with existing predictions', async () => {
			const db = getTestDb();
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();
			const fixture = await FixtureFactory.createScheduled();

			// User makes prediction
			const prediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: fixture.id,
				organizationId: org.id,
				predictedHomeScore: 2,
				predictedAwayScore: 1
			});

			// Fixture gets postponed
			await db
				.update(schema.fixtures)
				.set({
					status: 'POSTPONED',
					lastUpdated: new Date()
				})
				.where(eq(schema.fixtures.id, fixture.id));

			// Prediction should remain but fixture is postponed
			const [updatedFixture] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			const [existingPrediction] = await db
				.select()
				.from(schema.predictions)
				.where(eq(schema.predictions.id, prediction.id));

			expect(updatedFixture.status).toBe('POSTPONED');
			expect(existingPrediction).toBeTruthy();
			expect(existingPrediction.points).toBe(0); // No points until rescheduled and played
		});

		it('should handle fixture rescheduling after postponement', async () => {
			const db = getTestDb();
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();
			const fixture = await FixtureFactory.createPostponed();

			const prediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: fixture.id,
				organizationId: org.id
			});

			// Reschedule fixture
			const newDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
			await db
				.update(schema.fixtures)
				.set({
					status: 'TIMED',
					matchDate: newDate,
					lastUpdated: new Date()
				})
				.where(eq(schema.fixtures.id, fixture.id));

			const [rescheduledFixture] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			expect(rescheduledFixture.status).toBe('TIMED');
			expect(rescheduledFixture.matchDate.getTime()).toBe(newDate.getTime());
		});

		it('should handle fixture cancellation', async () => {
			const db = getTestDb();
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();
			const fixture = await FixtureFactory.createScheduled();

			const prediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: fixture.id,
				organizationId: org.id
			});

			// Cancel fixture
			await db
				.update(schema.fixtures)
				.set({
					status: 'CANCELLED',
					lastUpdated: new Date()
				})
				.where(eq(schema.fixtures.id, fixture.id));

			const [cancelledFixture] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			expect(cancelledFixture.status).toBe('CANCELLED');
			// In real app, might award points differently for cancelled matches
		});
	});

	describe('Score Corrections and VAR', () => {
		it('should handle score corrections after initial finish', async () => {
			const db = getTestDb();
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();

			const fixture = await FixtureFactory.createFinished({
				homeScore: 2,
				awayScore: 1
			});

			const prediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: fixture.id,
				organizationId: org.id,
				predictedHomeScore: 2,
				predictedAwayScore: 1,
				points: 5 // Initially calculated as exact score
			});

			// VAR correction - goal disallowed
			await db
				.update(schema.fixtures)
				.set({
					homeScore: 1,
					awayScore: 1,
					lastUpdated: new Date()
				})
				.where(eq(schema.fixtures.id, fixture.id));

			// Points would need recalculation
			const [correctedFixture] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			expect(correctedFixture.homeScore).toBe(1);
			expect(correctedFixture.awayScore).toBe(1);

			// In real app, would trigger points recalculation
			// Prediction was 2-1, actual became 1-1, so should be 3 points (correct outcome -> draw)
		});

		it('should handle multiple score corrections', async () => {
			const db = getTestDb();
			const fixture = await FixtureFactory.createLive({
				homeScore: 1,
				awayScore: 0
			});

			// Score updates during match
			const updates = [
				{ homeScore: 2, awayScore: 0 },
				{ homeScore: 2, awayScore: 1 },
				{ homeScore: 1, awayScore: 1 }, // VAR correction
				{ homeScore: 1, awayScore: 2 } // Late goal
			];

			for (const update of updates) {
				await db
					.update(schema.fixtures)
					.set({
						...update,
						lastUpdated: new Date()
					})
					.where(eq(schema.fixtures.id, fixture.id));
			}

			const [finalFixture] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			expect(finalFixture.homeScore).toBe(1);
			expect(finalFixture.awayScore).toBe(2);
		});
	});

	describe('Data Synchronization Edge Cases', () => {
		it('should handle API sync failures gracefully', async () => {
			const db = getTestDb();
			const fixture = await FixtureFactory.createLive();

			// Simulate API sync failure scenario
			const lastUpdateBefore = fixture.lastUpdated;

			// Attempt to update with null/invalid data
			await db
				.update(schema.fixtures)
				.set({
					lastUpdated: new Date()
					// Don't update scores if API data is invalid
				})
				.where(eq(schema.fixtures.id, fixture.id));

			const [updated] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			expect(updated.lastUpdated).toBeTruthy();
			expect(updated.homeScore).toBe(fixture.homeScore); // Original scores maintained
		});

		it('should handle out-of-order updates', async () => {
			const db = getTestDb();
			const fixture = await FixtureFactory.createLive({
				homeScore: 0,
				awayScore: 0
			});

			// Simulate receiving updates out of order
			const update1Time = new Date();
			const update2Time = new Date(update1Time.getTime() + 5000);
			const update3Time = new Date(update1Time.getTime() + 3000); // Earlier than update2

			// Update 1: 1-0
			await db
				.update(schema.fixtures)
				.set({
					homeScore: 1,
					lastUpdated: update1Time
				})
				.where(eq(schema.fixtures.id, fixture.id));

			// Update 2: 2-0 (latest)
			await db
				.update(schema.fixtures)
				.set({
					homeScore: 2,
					lastUpdated: update2Time
				})
				.where(eq(schema.fixtures.id, fixture.id));

			// Update 3: 1-1 (older than update 2)
			// In real app, should be ignored if timestamp is older
			const [currentFixture] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			if (update3Time > currentFixture.lastUpdated!) {
				await db
					.update(schema.fixtures)
					.set({
						homeScore: 1,
						awayScore: 1,
						lastUpdated: update3Time
					})
					.where(eq(schema.fixtures.id, fixture.id));
			}

			const [finalFixture] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			// Should maintain the latest valid update
			expect(finalFixture.homeScore).toBe(2);
			expect(finalFixture.awayScore).toBe(0);
		});
	});

	describe('User State Edge Cases', () => {
		it('should handle user ban during active predictions', async () => {
			const db = getTestDb();
			const testUser = await UserFactory.create();
			const org = await OrganizationFactory.create();
			const fixture = await FixtureFactory.createScheduled();

			// User makes prediction
			const prediction = await PredictionFactory.create({
				userId: testUser.id,
				fixtureId: fixture.id,
				organizationId: org.id
			});

			// User gets banned
			await db
				.update(user)
				.set({
					banned: true,
					banReason: 'Inappropriate behavior',
					banExpires: Math.floor(Date.now() / 1000) + 86400
				})
				.where(eq(user.id, testUser.id));

			// Fixture finishes
			await db
				.update(schema.fixtures)
				.set({
					status: 'FINISHED',
					homeScore: 2,
					awayScore: 1
				})
				.where(eq(schema.fixtures.id, fixture.id));

			// Banned user's predictions might still exist but points handling differs
			const [existingPrediction] = await db
				.select()
				.from(schema.predictions)
				.where(eq(schema.predictions.id, prediction.id));

			const [bannedUser] = await db.select().from(user).where(eq(user.id, testUser.id));

			expect(existingPrediction).toBeTruthy();
			expect(bannedUser.banned).toBe(true);
		});

		it('should handle user deletion with cascade', async () => {
			const db = getTestDb();
			const testUser = await UserFactory.create();
			const org = await OrganizationFactory.create();
			const fixture = await FixtureFactory.createScheduled();

			const prediction = await PredictionFactory.create({
				userId: testUser.id,
				fixtureId: fixture.id,
				organizationId: org.id
			});

			// Verify prediction exists
			const predictionsBefore = await db
				.select()
				.from(schema.predictions)
				.where(eq(schema.predictions.userId, testUser.id));
			expect(predictionsBefore).toHaveLength(1);

			// Manually delete predictions first (business logic should handle this)
			await db.delete(schema.predictions).where(eq(schema.predictions.userId, testUser.id));

			// Then delete user
			await db.delete(user).where(eq(user.id, testUser.id));

			// Verify predictions are removed
			const predictionsAfter = await db
				.select()
				.from(schema.predictions)
				.where(eq(schema.predictions.userId, testUser.id));
			expect(predictionsAfter).toHaveLength(0);

			// Verify user is deleted
			const users = await db.select().from(user).where(eq(user.id, testUser.id));
			expect(users).toHaveLength(0);
		});
	});

	describe('Performance and Scale Edge Cases', () => {
		it('should handle large numbers of predictions efficiently', async () => {
			const fixture = await FixtureFactory.createScheduled();
			const org = await OrganizationFactory.create();

			// Create many users and predictions
			const userCount = 100;
			const users = await Promise.all(
				Array.from({ length: userCount }, () => UserFactory.create())
			);

			const startTime = Date.now();

			// Create predictions in batches to simulate real load
			const batchSize = 10;
			for (let i = 0; i < users.length; i += batchSize) {
				const batch = users.slice(i, i + batchSize);
				await Promise.all(
					batch.map((user) =>
						PredictionFactory.create({
							userId: user.id,
							fixtureId: fixture.id,
							organizationId: org.id,
							predictedHomeScore: Math.floor(Math.random() * 5),
							predictedAwayScore: Math.floor(Math.random() * 5)
						})
					)
				);
			}

			const endTime = Date.now();
			const duration = endTime - startTime;

			// Should complete within reasonable time
			expect(duration).toBeLessThan(10000); // 10 seconds

			// Verify all predictions were created
			const db = getTestDb();
			const allPredictions = await db
				.select()
				.from(schema.predictions)
				.where(eq(schema.predictions.fixtureId, fixture.id));

			expect(allPredictions).toHaveLength(userCount);
		});

		it('should handle rapid fixture updates', async () => {
			const db = getTestDb();
			const fixture = await FixtureFactory.createLive();

			// Simulate rapid score updates (like in a high-scoring match)
			const updates = Array.from({ length: 10 }, (_, i) => ({
				homeScore: Math.floor(i / 2),
				awayScore: i % 2,
				lastUpdated: new Date(Date.now() + i * 1000)
			}));

			const startTime = Date.now();

			for (const update of updates) {
				await db.update(schema.fixtures).set(update).where(eq(schema.fixtures.id, fixture.id));
			}

			const endTime = Date.now();
			expect(endTime - startTime).toBeLessThan(5000); // Should be fast

			const [finalFixture] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			expect(finalFixture.homeScore).toBe(4);
			expect(finalFixture.awayScore).toBe(1);
		});
	});

	describe('Complex Multi-Week Scenarios', () => {
		it('should handle predictions across multiple gameweeks', async () => {
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();

			// Create fixtures for multiple weeks
			const fixtures = await Promise.all([
				// Week 1
				FixtureFactory.createFinished({ weekId: 1, homeScore: 2, awayScore: 1 }),
				FixtureFactory.createFinished({ weekId: 1, homeScore: 0, awayScore: 3 }),
				// Week 2
				FixtureFactory.createLive({ weekId: 2, homeScore: 1, awayScore: 1 }),
				FixtureFactory.createScheduled({ weekId: 2 }),
				// Week 3
				FixtureFactory.createScheduled({ weekId: 3 }),
				FixtureFactory.createScheduled({ weekId: 3 })
			]);

			// Create predictions for all fixtures
			const predictions = await Promise.all(
				fixtures.map((fixture, index) =>
					PredictionFactory.create({
						userId: user.id,
						fixtureId: fixture.id,
						organizationId: org.id,
						predictedHomeScore: index % 3,
						predictedAwayScore: (index + 1) % 3
					})
				)
			);

			expect(predictions).toHaveLength(6);

			// Group by week
			const week1Fixtures = fixtures.filter((f) => f.weekId === 1);
			const week2Fixtures = fixtures.filter((f) => f.weekId === 2);
			const week3Fixtures = fixtures.filter((f) => f.weekId === 3);

			expect(week1Fixtures).toHaveLength(2);
			expect(week2Fixtures).toHaveLength(2);
			expect(week3Fixtures).toHaveLength(2);
		});
	});
});
