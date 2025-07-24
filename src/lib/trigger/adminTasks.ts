import { task, schedules } from '@trigger.dev/sdk/v3';
import { db } from './adapters/dbAdapter';
import { predictions, fixtures, leagueTable } from '../server/db/schema';
import { user as authUser } from '../server/db/auth/auth-schema';
import { eq, count, and, inArray } from 'drizzle-orm';
import {
	getCurrentWeek,
	updateAllWeekMultipliers,
	updateCurrentWeekMultipliers
} from '../server/football/fixtures';

/**
 * Interface for task results
 */
interface TaskResult {
	success: boolean;
	message: string;
	details?: any;
}

/**
 * Task to update fixture counts for all users
 * This counts predicted fixtures and completed fixtures for leaderboard accuracy
 */
export const updateFixtureCountsTask = task({
	id: 'update-fixture-counts',
	run: async (): Promise<TaskResult> => {
		try {
			console.log('🔄 Starting fixture counts update...');

			// Get all users from the league table
			const leagueEntries = await db.select().from(leagueTable);
			console.log(`Found ${leagueEntries.length} users to update`);

			let updatedCount = 0;

			// Update each user's fixture counts
			for (const entry of leagueEntries) {
				// Get all predictions for this user
				const userPredictions = await db
					.select()
					.from(predictions)
					.where(eq(predictions.userId, entry.userId));

				// Get all fixture IDs that this user has predicted
				const fixtureIds = userPredictions.map((p) => p.fixtureId);

				if (fixtureIds.length > 0) {
					// Count completed fixtures that this user predicted
					const completedFixtures = await db
						.select()
						.from(fixtures)
						.where(and(inArray(fixtures.id, fixtureIds), eq(fixtures.status, 'completed')));

					// Update the league table with the counts
					await db
						.update(leagueTable)
						.set({
							predictedFixtures: userPredictions.length,
							completedFixtures: completedFixtures.length
						})
						.where(eq(leagueTable.id, entry.id));

					updatedCount++;
				}
			}

			console.log(`✅ Updated fixture counts for ${updatedCount} users`);

			return {
				success: true,
				message: `Updated fixture counts for ${updatedCount} users`,
				details: { updatedUsers: updatedCount, totalUsers: leagueEntries.length }
			};
		} catch (error) {
			console.error('❌ Failed to update fixture counts:', error);
			return {
				success: false,
				message: `Failed to update fixture counts: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}
});

/**
 * Task to update current week multipliers
 * This updates point multipliers for the current week's fixtures
 */
export const updateCurrentWeekMultipliersTask = task({
	id: 'update-current-week-multipliers',
	run: async (): Promise<TaskResult> => {
		try {
			console.log('🔄 Starting current week multipliers update...');

			const currentWeek = await getCurrentWeek();
			console.log(`Current week: ${currentWeek}`);

			await updateCurrentWeekMultipliers(currentWeek);

			console.log('✅ Current week multipliers updated successfully');

			return {
				success: true,
				message: `Current week ${currentWeek} multipliers updated successfully`,
				details: { currentWeek }
			};
		} catch (error) {
			console.error('❌ Failed to update current week multipliers:', error);
			return {
				success: false,
				message: `Failed to update current week multipliers: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}
});

/**
 * Task to update all multipliers
 * This updates point multipliers for all fixtures across all weeks
 */
export const updateAllMultipliersTask = task({
	id: 'update-all-multipliers',
	run: async (): Promise<TaskResult> => {
		try {
			console.log('🔄 Starting all multipliers update...');

			await updateAllWeekMultipliers();

			console.log('✅ All multipliers updated successfully');

			return {
				success: true,
				message: 'All multipliers updated successfully'
			};
		} catch (error) {
			console.error('❌ Failed to update all multipliers:', error);
			return {
				success: false,
				message: `Failed to update all multipliers: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}
});

/**
 * Task to recover fixtures with missing scores
 * This finds and fixes fixtures with missing scores or incorrect statuses
 */
export const recoverFixturesTask = task({
	id: 'recover-fixtures',
	run: async (): Promise<TaskResult> => {
		try {
			console.log('🔄 Starting fixture recovery...');

			// Dynamic import to avoid circular dependencies
			const { recoverMissedFixtures } = await import('../server/football/predictions');
			const result = await recoverMissedFixtures();

			console.log(
				`✅ Recovery completed: ${result.scanned} fixtures scanned, ${result.updated} updated, ${result.reprocessedPredictions} predictions reprocessed`
			);

			return {
				success: true,
				message: `Recovery completed: ${result.scanned} fixtures scanned, ${result.updated} updated, ${result.reprocessedPredictions} predictions reprocessed`,
				details: result
			};
		} catch (error) {
			console.error('❌ Failed to recover fixtures:', error);
			return {
				success: false,
				message: `Failed to recover fixtures: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}
});

/**
 * Task to recalculate all prediction points
 * This is a heavy operation that recalculates all prediction points from scratch
 */
export const recalculateAllPointsTask = task({
	id: 'recalculate-all-points',
	run: async (): Promise<TaskResult> => {
		try {
			console.log('🔄 Starting points recalculation...');

			// Dynamic import to avoid circular dependencies
			const { recalculateAllPoints } = await import('../scripts/recalculate-points-api');

			const result = await recalculateAllPoints();

			console.log('✅ Points recalculation completed successfully');

			return {
				success: true,
				message: 'All prediction points recalculated successfully',
				details: result
			};
		} catch (error) {
			console.error('❌ Failed to recalculate points:', error);
			return {
				success: false,
				message: `Failed to recalculate points: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}
});

/**
 * Scheduled task to automatically update current week multipliers
 * Runs every Monday at 6:00 AM UTC (before most matches start)
 */
export const autoUpdateMultipliersTask = schedules.task({
	id: 'auto-update-multipliers',
	cron: {
		pattern: '0 6 * * 1', // Every Monday at 6:00 AM UTC
		timezone: 'UTC'
	},
	run: async (payload) => {
		console.log(`Scheduled multipliers update running at ${payload.timestamp}`);

		// Trigger the current week multipliers update task
		const result = await updateCurrentWeekMultipliersTask.trigger();

		console.log(`Multipliers update task triggered with run ID: ${result.id}`);

		return {
			success: true,
			triggeredTask: result.id,
			message: 'Weekly multipliers update triggered successfully'
		};
	}
});

/**
 * Scheduled task to automatically recover missing fixture scores
 * Runs every 2 hours to catch any fixtures that may have been missed
 */
export const autoRecoverFixturesTask = schedules.task({
	id: 'auto-recover-fixtures',
	cron: {
		pattern: '0 */2 * * *', // Every 2 hours
		timezone: 'UTC'
	},
	run: async (payload) => {
		console.log(`Scheduled fixture recovery running at ${payload.timestamp}`);

		// Trigger the recover fixtures task
		const result = await recoverFixturesTask.trigger();

		console.log(`Fixture recovery task triggered with run ID: ${result.id}`);

		return {
			success: true,
			triggeredTask: result.id,
			message: 'Fixture recovery triggered successfully'
		};
	}
});

/**
 * Task to seed 2025 season fixtures
 * This fetches and populates fixtures for the 2025-26 Premier League season
 */
export const seed2025FixturesTask = task({
	id: 'seed-2025-fixtures',
	run: async (): Promise<TaskResult> => {
		try {
			console.log('🔄 Starting 2025 season fixtures seeding...');

			// Dynamic import to avoid circular dependencies
			const { seedFixturesWithMatchId } = await import('../server/football/fixtures/fixtureApi');

			await seedFixturesWithMatchId('2025');

			console.log('✅ 2025 season fixtures seeded successfully');

			return {
				success: true,
				message: '2025 season fixtures seeded successfully'
			};
		} catch (error) {
			console.error('❌ Failed to seed 2025 fixtures:', error);
			return {
				success: false,
				message: `Failed to seed 2025 fixtures: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}
});

/**
 * One-time scheduled task to seed 2025 season fixtures
 * Runs once when 2025 fixtures become available (typically June/July)
 */
export const autoSeed2025FixturesTask = schedules.task({
	id: 'auto-seed-2025-fixtures',
	cron: {
		pattern: '0 2 25 7 *', // July 25th at 2:00 AM UTC (one-time run)
		timezone: 'UTC'
	},
	run: async (payload) => {
		console.log(`Scheduled 2025 fixtures seeding running at ${payload.timestamp}`);

		// Trigger the 2025 fixtures seeding task
		const result = await seed2025FixturesTask.trigger();

		console.log(`2025 fixtures seeding task triggered with run ID: ${result.id}`);

		return {
			success: true,
			triggeredTask: result.id,
			message: '2025 season fixtures seeding triggered successfully'
		};
	}
});

/**
 * Scheduled task to update fixture counts
 * Runs daily at 8:00 AM UTC to keep leaderboard data accurate
 */
export const autoUpdateFixtureCountsTask = schedules.task({
	id: 'auto-update-fixture-counts',
	cron: {
		pattern: '0 8 * * *', // Daily at 8:00 AM UTC
		timezone: 'UTC'
	},
	run: async (payload) => {
		console.log(`Scheduled fixture counts update running at ${payload.timestamp}`);

		// Trigger the fixture counts update task
		const result = await updateFixtureCountsTask.trigger();

		console.log(`Fixture counts update task triggered with run ID: ${result.id}`);

		return {
			success: true,
			triggeredTask: result.id,
			message: 'Fixture counts update triggered successfully'
		};
	}
});
