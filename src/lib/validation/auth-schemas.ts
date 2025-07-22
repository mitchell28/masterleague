import { z } from 'zod';

// Login schema
export const authLoginSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters')
});

// Signup schema
export const authSignupSchema = z.object({
	username: z.string().min(3, 'Username must be at least 3 characters'),
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters')
});

// OTP schemas
export const otpRequestSchema = z.object({
	email: z.string().email('Please enter a valid email address')
});

export const otpVerifySchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	otp: z.string().length(6, 'Please enter a 6-digit code')
});

// Email verification schema
export const emailVerificationSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	otp: z.string().length(6, 'Please enter a 6-digit code')
});

// Export types for TypeScript
export type AuthLoginSchema = typeof authLoginSchema;
export type AuthSignupSchema = typeof authSignupSchema;
export type OtpRequestSchema = typeof otpRequestSchema;
export type OtpVerifySchema = typeof otpVerifySchema;
export type EmailVerificationSchema = typeof emailVerificationSchema;
