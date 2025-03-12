import { error, fail, redirect } from '@sveltejs/kit';
import { getFixturesByWeek, getCurrentWeek } from '$lib/server/football/fixtures';
import { getUserPredictionsByWeek, submitPredictions } from '$lib/server/football/predictions';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { teams, fixtures as fixturesSchema, predictions } from '$lib/server/db/schema';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, locals }) => {
	// Check if user is authenticated
	// Adjust this based on how session/auth is implemented in your app
	if (!locals.user?.id) {
		throw redirect(302, '/auth/login');
	}
	const userId = locals.user.id;

	// Get week from URL or use current week
	const requestedWeek = url.searchParams.get('week');
	const currentWeek = getCurrentWeek();
	const week = requestedWeek ? parseInt(requestedWeek) : currentWeek;

	// Get all available weeks
	const weeksQuery = await db
		.select({ weekId: fixturesSchema.weekId })
		.from(fixturesSchema)
		.groupBy(fixturesSchema.weekId)
		.orderBy(fixturesSchema.weekId);

	const weeks = weeksQuery.map((row) => row.weekId);

	// Get fixtures for the selected week
	const fixtures = await getFixturesByWeek(week);
	if (!fixtures.length) {
		return {
			currentWeek,
			week,
			weeks,
			fixtures: [],
			predictions: {},
			teams: {}
		};
	}

	// Get user's predictions for this week
	const predictions = await getUserPredictionsByWeek(userId, week);

	// Get all teams for display
	const allTeams = await db.select().from(teams);
	const teamsMap = allTeams.reduce(
		(acc, team) => {
			acc[team.id] = team;
			return acc;
		},
		{} as Record<string, typeof teams.$inferSelect>
	);

	// Check if prediction cutoff time has passed for each fixture
	const now = new Date();
	const fixturesWithPrediction = fixtures.map((fixture) => {
		// Ensure we're parsing the date correctly by using explicit ISO format
		// This avoids issues with different date formats in different regions
		let fixtureDate;
		try {
			// Try to parse the date in a locale-independent way
			if (typeof fixture.matchDate === 'string') {
				// Force ISO format interpretation
				fixtureDate = new Date(fixture.matchDate);
			} else {
				// If it's already a Date object or timestamp
				fixtureDate = new Date(fixture.matchDate);
			}
		} catch (e) {
			console.error(`Error parsing date for fixture ${fixture.id}:`, e);
			fixtureDate = new Date(); // Fallback to current date
		}

		// Calculate cutoff as 15 minutes before match start
		const cutoffDate = new Date(fixtureDate.getTime() - 15 * 60 * 1000);

		return {
			...fixture,
			// Mark as predictable if it's a scheduled match
			canPredict: fixture.status === 'upcoming'
		};
	});

	// Convert predictions to a map for easier access in the frontend
	const predictionsMap = predictions.reduce(
		(acc, prediction) => {
			acc[prediction.fixtureId] = prediction;
			return acc;
		},
		{} as Record<string, (typeof predictions)[0]>
	);

	return {
		currentWeek,
		week,
		weeks,
		fixtures: fixturesWithPrediction,
		predictions: predictionsMap,
		teams: teamsMap
	};
};

export const actions = {
	submitPredictions: async ({ request, locals, url }) => {
		// Check if user is authenticated
		if (!locals.user?.id) {
			throw error(401, 'You must be logged in to submit predictions');
		}
		const userId = locals.user.id;

		// Get current week from URL or default to current week
		const requestedWeek = url.searchParams.get('week');
		const currentWeek = getCurrentWeek();
		const week = requestedWeek ? parseInt(requestedWeek) : currentWeek;

		// Get the valid fixtures for this week
		const validFixtures = await getFixturesByWeek(week);
		const validFixtureIds = new Set(validFixtures.map((fixture) => fixture.id));

		const data = await request.formData();
		const predictionsData: Array<{
			fixtureId: string;
			homeScore: number;
			awayScore: number;
		}> = [];

		// Process all form fields
		const predictionEntries = new Map();
		for (const [key, value] of data.entries()) {
			if (key.startsWith('prediction-')) {
				// Parse the key correctly to handle UUIDs with hyphens
				// Format is "prediction-{fixtureId}-{team}"
				// Extract fixtureId by removing "prediction-" prefix and "-home" or "-away" suffix
				let fixtureId, team;

				if (key.endsWith('-home')) {
					fixtureId = key.slice('prediction-'.length, -'-home'.length);
					team = 'home';
				} else if (key.endsWith('-away')) {
					fixtureId = key.slice('prediction-'.length, -'-away'.length);
					team = 'away';
				} else {
					continue;
				}

				// Skip if fixture doesn't exist
				if (!validFixtureIds.has(fixtureId)) {
					continue;
				}

				// Store the value in our map to collect home/away pairs
				if (!predictionEntries.has(fixtureId)) {
					predictionEntries.set(fixtureId, {});
				}

				const score = parseInt(value.toString()) || 0;
				predictionEntries.get(fixtureId)[team] = score;
			}
		}

		// Now process the collected entries
		for (const [fixtureId, scores] of predictionEntries.entries()) {
			// Only add complete predictions with both home and away scores
			if (scores.home !== undefined && scores.away !== undefined) {
				predictionsData.push({
					fixtureId,
					homeScore: scores.home,
					awayScore: scores.away
				});
			}
		}

		// Only submit if we have valid predictions
		if (predictionsData.length === 0) {
			return { success: true, message: 'No valid predictions to submit' };
		}

		try {
			// Submit predictions
			const results = await submitPredictions(userId, predictionsData);
			return {
				success: true,
				message: `Successfully saved ${results.length} predictions`
			};
		} catch (error) {
			console.error('Error submitting predictions:', error);
			const errorMessage = error instanceof Error ? error.message : 'Failed to submit predictions';

			// Check for specific error types
			if (errorMessage.includes('cutoff time has passed')) {
				return fail(400, {
					success: false,
					message: 'The prediction window has closed for one or more matches'
				});
			} else if (errorMessage.includes('not found')) {
				return fail(400, {
					success: false,
					message: 'One or more selected matches are no longer available'
				});
			}

			return fail(400, {
				success: false,
				message: errorMessage
			});
		}
	}
} satisfies Actions;
