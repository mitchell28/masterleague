import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db';
import { predictions, fixtures, leagueTable } from '$lib/server/db/schema';
import {
	getCurrentWeek,
	updateAllWeekMultipliers,
	updateCurrentWeekMultipliers
} from '$lib/server/football/fixtures';
import { eq, count, and, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Verify user is admin
	if (locals.user?.role !== 'admin') {
		throw redirect(303, '/');
	}

	try {
		// User count
		const totalUsers = await db
			.select({ count: count() })
			.from(user)
			.then((results) => results[0]?.count || 0);

		// Prediction count
		const totalPredictions = await db
			.select({ count: count() })
			.from(predictions)
			.then((results) => results[0]?.count || 0);

		// Current week
		const currentWeek = getCurrentWeek();

		return {
			stats: {
				totalUsers,
				totalPredictions,
				currentWeek
			}
		};
	} catch (err) {
		console.error('Error loading admin data:', err);
		throw error(500, { message: 'Failed to load admin data' });
	}
};

export const actions: Actions = {
	updateFixtureCounts: async ({ locals }) => {
		if (locals.user?.role !== 'admin') {
			throw error(403, 'Not authorized');
		}

		try {
			// Get all users from the league table
			const leagueEntries = await db.select().from(leagueTable);

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
				}
			}

			return { success: true, message: 'Fixture counts updated successfully' };
		} catch (error) {
			console.error('Failed to update fixture counts:', error);
			return { success: false, message: 'Failed to update fixture counts' };
		}
	},
	updateMultipliers: async ({ locals }) => {
		// Only accessible to admins
		if (!locals.user?.isAdmin) {
			throw error(403, 'Not authorized');
		}

		try {
			await updateCurrentWeekMultipliers();
			return { success: true, message: 'Multipliers updated successfully' };
		} catch (err) {
			console.error('Error updating multipliers:', err);
			return { success: false, message: 'Failed to update multipliers' };
		}
	},

	updateAllMultipliers: async ({ locals }) => {
		// Only accessible to admins
		if (!locals.user?.isAdmin) {
			throw error(403, 'Not authorized');
		}

		try {
			await updateAllWeekMultipliers();
			return { success: true, message: 'All multipliers updated successfully' };
		} catch (err) {
			console.error('Error updating all multipliers:', err);
			return { success: false, message: 'Failed to update all multipliers' };
		}
	}
};
