import { z } from 'zod';
// User validation schemas
export const registerSchema = z
	.object({
		email: z
			.string()
			.min(3, { message: 'Email must be at least 3 characters' })
			.max(50, { message: 'Email must be less than 50 characters' })
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
	email: z.string().min(1, { message: 'Email is required' }),
	password: z.string().min(1, { message: 'Password is required' })
});
// Modified version of the register schema to support Better Auth
// Use a plain object schema without refinements first
export const authRegisterSchema = z.object({
	email: z
		.string()
		.min(3, { message: 'Email must be at least 3 characters' })
		.max(50, { message: 'Email must be less than 50 characters' })
		.trim(),
	password: z
		.string()
		.min(8, { message: 'Password must be at least 8 characters' })
		.regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
		.regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
		.regex(/[0-9]/, { message: 'Password must contain at least one number' }),
	confirmPassword: z.string()
});

// Create a validation function that includes the refinement check
export function validateRegisterData(data: unknown): {
	success: boolean;
	data?: z.infer<typeof authRegisterSchema>;
	error?: string;
} {
	try {
		// First validate with the base schema
		const result = authRegisterSchema.parse(data);

		// Then do the password match check
		if (result.password !== result.confirmPassword) {
			return {
				success: false,
				error: "Passwords don't match"
			};
		}

		return {
			success: true,
			data: result
		};
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				success: false,
				error: error.errors[0]?.message || 'Invalid data'
			};
		}
		return {
			success: false,
			error: 'Validation failed'
		};
	}
}

// Modified version of the login schema for Better Auth
export const authLoginSchema = z.object({
	email: z.string().min(1, { message: 'Email is required' }),
	password: z.string().min(1, { message: 'Password is required' })
});

// Types for form data
export type RegisterFormData = z.infer<typeof authRegisterSchema>;
export type LoginFormData = z.infer<typeof authLoginSchema>;
