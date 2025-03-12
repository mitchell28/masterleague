import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Mock $env/static/private and $env/dynamic/private for SvelteKit compatibility
// This allows us to import functions that use these SvelteKit-specific modules
if (!(global as any).svelteKitEnvMocked) {
	// @ts-ignore
	(global as any).svelteKitEnvMocked = true;

	// Mock $env/static/private
	const mockStaticPrivate = {
		FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY,
		DATABASE_URL: process.env.DATABASE_URL
	};

	// Mock $env/dynamic/private
	const mockDynamicPrivate = {
		env: {
			DATABASE_URL: process.env.DATABASE_URL,
			FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY
		}
	};

	// Override require and import for these modules
	// @ts-ignore
	const originalResolveFilename = module.constructor._resolveFilename;
	// @ts-ignore
	module.constructor._resolveFilename = function (
		request: string,
		parent: any,
		isMain: boolean,
		options: any
	) {
		if (request === '$env/static/private') {
			return '$env/static/private.mock';
		}
		if (request === '$env/dynamic/private') {
			return '$env/dynamic/private.mock';
		}
		return originalResolveFilename(request, parent, isMain, options);
	};

	// @ts-ignore
	require.extensions['$env/static/private.mock'] = function (module: any) {
		module.exports = mockStaticPrivate;
	};

	// @ts-ignore
	require.extensions['$env/dynamic/private.mock'] = function (module: any) {
		module.exports = mockDynamicPrivate;
	};
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Create the Neon PostgreSQL client
const sql = neon(DATABASE_URL);

// Export the database connection
export const db = drizzle(sql);
