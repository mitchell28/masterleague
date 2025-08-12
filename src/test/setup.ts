import { vi } from 'vitest';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, clearAllTables } from './database';

// Setup test database before all tests
beforeAll(async () => {
	await setupTestDatabase();
});

// Cleanup after all tests
afterAll(async () => {
	await cleanupTestDatabase();
});

// Clear tables before each test for isolation
beforeEach(async () => {
	await clearAllTables();
});

// Mock environment variables for testing
vi.mock('$env/static/private', () => ({
	DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
	FOOTBALL_DATA_API_KEY: 'test-api-key',
	BETTER_AUTH_SECRET: 'test-secret',
	BETTER_AUTH_URL: 'http://localhost:5173'
}));

// Mock SvelteKit navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	preloadData: vi.fn(),
	preloadCode: vi.fn(),
	onNavigate: vi.fn(),
	afterNavigate: vi.fn(),
	beforeNavigate: vi.fn()
}));

// Mock SvelteKit stores
vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn(() => ({
			url: new URL('http://localhost:5173'),
			params: {},
			route: { id: null },
			status: 200,
			error: null,
			data: {},
			form: undefined
		}))
	},
	navigating: {
		subscribe: vi.fn(() => null)
	},
	updated: {
		subscribe: vi.fn(() => false),
		check: vi.fn()
	}
}));
