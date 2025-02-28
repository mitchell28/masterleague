import { z } from 'zod';

// User validation schemas
export const registerSchema = z
	.object({
		username: z
			.string()
			.min(3, { message: 'Username must be at least 3 characters' })
			.max(50, { message: 'Username must be less than 50 characters' })
			.trim(),
		password: z
			.string()
			.min(8, { message: 'Password must be at least 8 characters' })
			.regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
			.regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
			.regex(/[0-9]/, { message: 'Password must contain at least one number' }),
		confirmPassword: z.string()
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	});

export const loginSchema = z.object({
	username: z.string().min(1, { message: 'Username is required' }),
	password: z.string().min(1, { message: 'Password is required' })
});

// Prediction validation schemas
export const predictionSchema = z.object({
	fixtureId: z.string().uuid({ message: 'Invalid fixture ID' }),
	homeScore: z
		.number()
		.int({ message: 'Home score must be an integer' })
		.nonnegative({ message: 'Home score must be 0 or greater' })
		.max(99, { message: 'Home score too large' }),
	awayScore: z
		.number()
		.int({ message: 'Away score must be an integer' })
		.nonnegative({ message: 'Away score must be 0 or greater' })
		.max(99, { message: 'Away score too large' })
});

export const predictionsArraySchema = z.object({
	predictions: z.array(predictionSchema).min(1, { message: 'At least one prediction is required' })
});

// Admin validation schemas
export const fixtureSchema = z
	.object({
		homeTeamId: z.string().uuid({ message: 'Invalid home team ID' }),
		awayTeamId: z.string().uuid({ message: 'Invalid away team ID' }),
		matchDate: z.number().positive({ message: 'Match date is required' }),
		weekId: z.number().positive({ message: 'Week ID is required' }),
		pointsMultiplier: z.number().int().min(1).max(5).default(1)
	})
	.refine((data) => data.homeTeamId !== data.awayTeamId, {
		message: 'Home team and away team cannot be the same',
		path: ['awayTeamId']
	});

export const teamSchema = z.object({
	name: z.string().min(2, { message: 'Team name must be at least 2 characters' }).max(50),
	shortName: z.string().min(2, { message: 'Short name must be at least 2 characters' }).max(5),
	logo: z.string().url({ message: 'Logo must be a valid URL' }).optional()
});

// Utility function to parse and handle validation
export function validateFormData<T extends z.ZodTypeAny>(
	schema: T,
	data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
	try {
		const validData = schema.parse(data);
		return { success: true, data: validData };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { success: false, errors: error };
		}
		throw error;
	}
}
