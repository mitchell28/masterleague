/**
 * Environment utility for detecting Trigger.dev context and safely importing environment variables
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

// Check if we're running in Trigger.dev context
export const isTriggerContext = () => {
	return (
		process.env.TRIGGER_API_KEY !== undefined ||
		process.env.TRIGGER_PROJECT_ID !== undefined ||
		process.env.TRIGGER_DEPLOYMENT_ID !== undefined
	);
};

// Safely get environment variables that work in both SvelteKit and Trigger.dev contexts
export const getEnvVar = (key: string): string | undefined => {
	// Always try process.env first (works in both contexts)
	const processEnvValue = process.env[key];
	if (processEnvValue) {
		return processEnvValue;
	}

	// In non-Trigger context, we could potentially fall back to SvelteKit env,
	// but since process.env should always work, we'll just return undefined
	return undefined;
};

// Common environment variables
export const getDatabase = () => ({
	url: getEnvVar('DATABASE_URL'),
	authToken: getEnvVar('DATABASE_AUTH_TOKEN')
});

export const getFootballApiKey = () => getEnvVar('FOOTBALL_DATA_API_KEY');
