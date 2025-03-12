import * as dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

// Create a mock for SvelteKit's $env/static/private module
const mockStaticPrivate = {
	FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY,
	DATABASE_URL: process.env.DATABASE_URL
};

// Create a mock for SvelteKit's $env/dynamic/private module
const mockDynamicPrivate = {
	env: {
		DATABASE_URL: process.env.DATABASE_URL,
		FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY
	}
};

// Register custom module loader for SvelteKit's $env modules
// @ts-ignore
process.mockEnv = true;

// This will help resolve the SvelteKit-specific imports in the scripts
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
		return 'env-static-private';
	}
	if (request === '$env/dynamic/private') {
		return 'env-dynamic-private';
	}
	return originalResolveFilename(request, parent, isMain, options);
};

// @ts-ignore
require.extensions['env-static-private'] = function (module: any) {
	module.exports = mockStaticPrivate;
};

// @ts-ignore
require.extensions['env-dynamic-private'] = function (module: any) {
	module.exports = mockDynamicPrivate;
};

// Now SvelteKit's $env modules should be resolvable in our scripts
