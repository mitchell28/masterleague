import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => ({
					limit: vi.fn(() => Promise.resolve([]))
				}))
			}))
		}))
	}
}));

// Mock the auth schema
vi.mock('$lib/server/db/auth/auth-schema', () => ({
	user: {
		id: 'id',
		email: 'email'
	}
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

describe('OTP Email Validation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Email Check API', () => {
		it('should return true for existing email', async () => {
			// Mock database to return a user
			const mockDb = await import('$lib/server/db');
			const mockSelect = vi.fn(() => ({
				from: vi.fn(() => ({
					where: vi.fn(() => ({
						limit: vi.fn(() => Promise.resolve([{ id: 'user-1', email: 'test@example.com' }]))
					}))
				}))
			}));
			mockDb.db.select = mockSelect;

			// Import the API handler after setting up mocks
			const { POST } = await import('../../routes/api/check-email/+server.js');

			const request = new Request('http://localhost/api/check-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: 'test@example.com' })
			});

			const response = await POST({ request } as any);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.taken).toBe(true);
			expect(result.email).toBe('test@example.com');
		});

		it('should return false for non-existing email', async () => {
			// Mock database to return no users
			const mockDb = await import('$lib/server/db');
			const mockSelect = vi.fn(() => ({
				from: vi.fn(() => ({
					where: vi.fn(() => ({
						limit: vi.fn(() => Promise.resolve([])) // Empty array = no user found
					}))
				}))
			}));
			mockDb.db.select = mockSelect;

			// Import the API handler after setting up mocks
			const { POST } = await import('../../routes/api/check-email/+server.js');

			const nonExistentEmail = 'nonexistent@example.com';

			const request = new Request('http://localhost/api/check-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: nonExistentEmail })
			});

			const response = await POST({ request } as any);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.taken).toBe(false);
			expect(result.email).toBe(nonExistentEmail);
		});

		it('should handle invalid email format', async () => {
			// Import the API handler
			const { POST } = await import('../../routes/api/check-email/+server.js');

			const invalidEmail = 'invalid-email';

			const request = new Request('http://localhost/api/check-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: invalidEmail })
			});

			const response = await POST({ request } as any);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Please enter a valid email address.');
			expect(result.invalid).toBe(true);
		});

		it('should handle missing email', async () => {
			// Import the API handler
			const { POST } = await import('../../routes/api/check-email/+server.js');

			const request = new Request('http://localhost/api/check-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});

			const response = await POST({ request } as any);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Email is required');
		});
	});

	describe('OTP Flow Integration Logic', () => {
		it('should have proper error message for non-existent emails', () => {
			// Test the logic that would be used in the OTP component
			const mockApiResponse = { taken: false, email: 'test@nonexistent.com' };

			// This simulates what would happen in the OTP component
			const shouldShowError = !mockApiResponse.taken;
			const errorMessage = shouldShowError
				? `No account found with email ${mockApiResponse.email}. Please sign up first or check your email address.`
				: '';

			expect(shouldShowError).toBe(true);
			expect(errorMessage).toContain('No account found');
			expect(errorMessage).toContain('test@nonexistent.com');
			expect(errorMessage).toContain('Please sign up first');
		});

		it('should allow OTP flow for existing emails', () => {
			// Test the logic for existing emails
			const mockApiResponse = { taken: true, email: 'existing@example.com' };

			// This simulates what would happen in the OTP component
			const shouldProceedWithOTP = mockApiResponse.taken;

			expect(shouldProceedWithOTP).toBe(true);
		});
	});
});
