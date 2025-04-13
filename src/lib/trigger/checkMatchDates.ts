import { schedules } from '@trigger.dev/sdk/v3';
import { checkFixtureScheduleChanges } from './adapters/fixtureSchedulingAdapter';

/**
 * Daily task to check if fixture dates have been changed in the football API
 * This scheduled task runs every day at 9:00 AM to ensure fixture dates are up-to-date
 */
export const checkFixtureSchedulesTask = schedules.task({
	id: 'check-fixture-schedules',
	// Define schedule directly in the task (declarative schedule)
	cron: {
		pattern: '0 9 * * *', // Run daily at 9:00 AM
		timezone: 'UTC' // Using UTC timezone
	},
	run: async (payload) => {
		try {
			// We can access timing information from the payload
			console.log(
				`Task running at ${payload.timestamp}, last run at ${payload.lastTimestamp || 'never'}`
			);
			console.log(`Next 5 runs: ${payload.upcoming.join(', ')}`);

			// Call our fixture scheduling service
			const result = await checkFixtureScheduleChanges();

			if (result.error) {
				console.error('Error checking fixture schedules:', result.error);
				return { success: false, error: result.error };
			}

			if (result.updated > 0) {
				console.log(
					`Updated ${result.updated} fixture schedules (checked ${result.checked} fixtures)`
				);
			} else {
				console.log(`No fixture schedule changes detected (checked ${result.checked} fixtures)`);
			}

			return {
				success: true,
				checked: result.checked,
				updated: result.updated,
				nextRun: payload.upcoming[0]
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error('Unexpected error checking fixture schedules:', errorMessage);

			return {
				success: false,
				error: errorMessage
			};
		}
	}
});
