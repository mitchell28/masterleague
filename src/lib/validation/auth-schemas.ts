import { z } from 'zod';

// Login schema
export const authLoginSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters')
});

// Signup schema
export const authSignupSchema = z.object({
	email: z.string().email(' Please enter a valid email address'),
	firstName: z.string().min(2, ' First Name must be at least 2 characters'),
	lastName: z.string().min(2, ' Last Name must be at least 2 characters'),
	password: z.string().min(8, ' Password must be at least 8 characters')
});

// OTP schemas
export const otpRequestSchema = z.object({
	email: z.string().email('Please enter a valid email address')
});

export const otpVerifySchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	otp: z
		.string()
		.trim()
		.length(6, 'Please enter a 6-digit code')
		.regex(/^\d{6}$/, 'Code must be exactly 6 digits')
});

// Email verification schema
export const emailVerificationSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	otp: z
		.string()
		.trim()
		.length(6, 'Please enter a 6-digit code')
		.regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
	// Optional signup credentials for auto-login
	signupEmail: z.string().optional(),
	signupPassword: z.string().optional()
});

export const authResetPasswordSchema = z
	.object({
		newPassword: z.string().min(8, 'New password must be at least 8 characters'),
		confirmPassword: z.string().min(8, 'Please confirm your new password')
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: 'Passwords do not match'
	});

// Password validation helper functions for consistent UI validation
export const passwordValidation = {
	isLongEnough: (password: string | undefined): boolean => {
		return Boolean(password && password.length >= 8);
	},

	doPasswordsMatch: (
		password: string | undefined,
		confirmPassword: string | undefined
	): boolean => {
		return Boolean(password && confirmPassword && password === confirmPassword);
	},

	isFormValid: (newPassword: string | undefined, confirmPassword: string | undefined): boolean => {
		return (
			passwordValidation.isLongEnough(newPassword) &&
			passwordValidation.isLongEnough(confirmPassword) &&
			passwordValidation.doPasswordsMatch(newPassword, confirmPassword)
		);
	},

	getPasswordStrengthMessage: (
		password: string | undefined
	): { message: string; type: 'error' | 'success' | null } => {
		if (!password) return { message: '', type: null };
		if (!passwordValidation.isLongEnough(password)) {
			return { message: 'Password must be at least 8 characters', type: 'error' };
		}
		return { message: 'Password meets requirements', type: 'success' };
	},

	getPasswordMatchMessage: (
		newPassword: string | undefined,
		confirmPassword: string | undefined
	): { message: string; type: 'error' | 'success' | null } => {
		if (!confirmPassword || !newPassword) return { message: '', type: null };
		if (!passwordValidation.doPasswordsMatch(newPassword, confirmPassword)) {
			return { message: 'Passwords do not match', type: 'error' };
		}
		return { message: 'Passwords match', type: 'success' };
	},

	// For single password fields (like signup)
	getSinglePasswordMessage: (
		password: string | undefined
	): { message: string; type: 'error' | 'success' | null } => {
		return passwordValidation.getPasswordStrengthMessage(password);
	}
};

// Export types for TypeScript
export type AuthLoginSchema = typeof authLoginSchema;
export type AuthSignupSchema = typeof authSignupSchema;
export type OtpRequestSchema = typeof otpRequestSchema;
export type OtpVerifySchema = typeof otpVerifySchema;
export type EmailVerificationSchema = typeof emailVerificationSchema;
export type AuthResetPasswordSchema = typeof authResetPasswordSchema;
