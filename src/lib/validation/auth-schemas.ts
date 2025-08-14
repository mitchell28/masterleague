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

// Export types for TypeScript
export type AuthLoginSchema = typeof authLoginSchema;
export type AuthSignupSchema = typeof authSignupSchema;
export type OtpRequestSchema = typeof otpRequestSchema;
export type OtpVerifySchema = typeof otpVerifySchema;
export type EmailVerificationSchema = typeof emailVerificationSchema;
