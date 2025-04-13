/**
 * Environment adapter for Trigger.dev
 *
 * This adapter provides environment variables using process.env instead of SvelteKit's $env modules.
 * Trigger.dev can't process SvelteKit's special imports like $env/static/private during bundling,
 * so we need to use this adapter for any environment variables needed by Trigger.dev tasks.
 */

// Football data API key for fixture updates
export const FOOTBALL_DATA_API_KEY: string | undefined = process.env.FOOTBALL_DATA_API_KEY;

// Database connection variables
export const DATABASE_URL: string | undefined = process.env.DATABASE_URL;
export const DATABASE_AUTH_TOKEN: string | undefined = process.env.DATABASE_AUTH_TOKEN;

// Any other environment variables needed by Trigger.dev tasks
export const TRIGGER_API_KEY: string | undefined = process.env.TRIGGER_API_KEY;
export const TRIGGER_API_URL: string | undefined = process.env.TRIGGER_API_URL;
export const TRIGGER_APP_ID: string | undefined = process.env.TRIGGER_APP_ID;

/**
 * Check if required environment variables are present
 * @param requiredVars Array of environment variable names that are required
 * @returns Array of missing environment variable names (empty if all are present)
 */
export function checkRequiredEnvVars(requiredVars: string[]): string[] {
	const missing: string[] = [];

	for (const varName of requiredVars) {
		if (!process.env[varName]) {
			missing.push(varName);
		}
	}

	return missing;
}
