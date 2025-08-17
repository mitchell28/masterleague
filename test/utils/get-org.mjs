import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Set up paths for the project
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = __dirname;

// Import from the TypeScript source (Node.js can handle .ts imports with proper setup)
try {
	// Try to import with .js extension (as TypeScript compiles to)
	const { db, organization } = await import('../../src/lib/server/db/index.js');

	console.log('Querying organizations...');
	const orgs = await db.select().from(organization).limit(5);
	console.log('Organizations found:', orgs);

	if (orgs.length > 0) {
		console.log('\nFirst organization ID:', orgs[0].id);
	} else {
		console.log('No organizations found in database');
	}
} catch (error) {
	console.error('Error:', error.message);
	console.log('\nTrying alternative import method...');

	// Alternative: Use tsx to run TypeScript directly
	console.log('Please run: npx tsx get-org-ts.ts');
}
