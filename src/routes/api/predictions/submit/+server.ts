import { json } from '@sveltejs/kit';
import { submitPredictions } from '$lib/server/football/predictions';
import type { RequestEvent } from '@sveltejs/kit';
import { predictionsArraySchema } from '$lib/validation/schemas';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { predictions } from '$lib/server/db/schema';
import { validateRequest, requireAuth } from '$lib/server/api-utils';

export async function POST(event: RequestEvent) {
	// Check if user is authenticated
	const authResult = requireAuth(event);
	if (!authResult.success) {
		return authResult.response;
	}

	// Get the user ID
	const userId = authResult.userId;

	try {
		// Validate the request using Zod middleware
		const validationResult = await validateRequest(event, predictionsArraySchema);
		if (!validationResult.success) {
			return validationResult.response;
		}

		// Get the validated data
		const { predictions: validatedPredictions } = validationResult.data;

		// Check if the user has already made predictions for any of these fixtures
		const fixtureIds = validatedPredictions.map((p) => p.fixtureId);
		const existingPredictions = await db
			.select()
			.from(predictions)
			.where(
				and(
					eq(predictions.userId, userId),
					// Use inArray operator from drizzle-orm
					inArray(predictions.fixtureId, fixtureIds)
				)
			);

		if (existingPredictions.length > 0) {
			const existingFixtureIds = existingPredictions.map((p) => p.fixtureId);

			// Filter to get only the fixtures that don't have predictions
			const newPredictions = validatedPredictions.filter(
				(p) => !existingFixtureIds.includes(p.fixtureId)
			);

			// If all predictions already exist, return an error
			if (newPredictions.length === 0) {
				return json(
					{
						success: false,
						message: 'You have already submitted predictions for these fixtures'
					},
					{ status: 409 }
				);
			}

			// Otherwise continue with only the new predictions
			const result = await submitPredictions(userId, newPredictions);

			return json({
				success: true,
				predictions: result,
				message: 'Some predictions were updated. Others were skipped as you already predicted them.'
			});
		}

		// Submit the predictions
		const result = await submitPredictions(userId, validatedPredictions);

		return json({ success: true, predictions: result });
	} catch (error) {
		console.error('Failed to submit predictions:', error);
		return json({ success: false, message: 'Failed to submit predictions' }, { status: 500 });
	}
}
