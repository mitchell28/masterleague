import type { RequestEvent } from '@sveltejs/kit';
import type { z } from 'zod';
import { json } from '@sveltejs/kit';

/**
 * A middleware function for validating API request bodies against a Zod schema
 *
 * @param event The SvelteKit request event
 * @param schema The Zod schema to validate against
 * @returns An object containing the validated data if successful, or a response to return if validation failed
 */
export async function validateRequest<T extends z.ZodTypeAny>(
	event: RequestEvent,
	schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: Response }> {
	try {
		const body = await event.request.json();
		const result = schema.safeParse(body);

		if (!result.success) {
			// Format the validation errors
			const formattedErrors = result.error.errors.map((err) => ({
				path: err.path.join('.'),
				message: err.message
			}));

			// Return a 400 Bad Request response with the validation errors
			return {
				success: false,
				response: json(
					{
						success: false,
						message: 'Validation failed',
						errors: formattedErrors
					},
					{ status: 400 }
				)
			};
		}

		// Return the validated data
		return { success: true, data: result.data };
	} catch (error) {
		// Handle JSON parsing errors
		return {
			success: false,
			response: json(
				{
					success: false,
					message: 'Invalid JSON in request body'
				},
				{ status: 400 }
			)
		};
	}
}

/**
 * Middleware to check if the user is authenticated
 *
 * @param event The SvelteKit request event
 * @returns An object indicating if the user is authenticated, with a response to return if not
 */
export function requireAuth(
	event: RequestEvent
): { success: true; userId: string } | { success: false; response: Response } {
	const user = event.locals.user;

	if (!user) {
		return {
			success: false,
			response: json({ success: false, message: 'Authentication required' }, { status: 401 })
		};
	}

	return { success: true, userId: user.id };
}

/**
 * Middleware to check if the user has admin role
 *
 * @param event The SvelteKit request event
 * @returns An object indicating if the user is an admin, with a response to return if not
 */
export function requireAdmin(
	event: RequestEvent
): { success: true; userId: string } | { success: false; response: Response } {
	const user = event.locals.user;

	if (!user) {
		return {
			success: false,
			response: json({ success: false, message: 'Authentication required' }, { status: 401 })
		};
	}

	if (user.role !== 'admin') {
		return {
			success: false,
			response: json({ success: false, message: 'Admin privileges required' }, { status: 403 })
		};
	}

	return { success: true, userId: user.id };
}
