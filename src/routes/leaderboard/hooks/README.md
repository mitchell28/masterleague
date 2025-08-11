# Recalculation Hooks

This file contains Svelte 5 hooks for managing points recalculation in the Master League application.

## Hook: `useRecalculation(organizationId?, season?)`

A reactive hook that provides functions for processing fixture points and updating league tables.

### Parameters

- `organizationId` (optional): The organization ID for league table updates
- `season` (optional): The season identifier (defaults to '2025-26')

### Returns

An object with the following methods:

#### `processRecentFixtures()`

Processes recent fixtures that need point calculation.
Returns: `Promise<RecalculationResult>`

#### `processFixtures(fixtureIds: string[])`

Processes specific fixtures by their IDs.
Returns: `Promise<RecalculationResult>`

#### `recalculateAll()`

Recalculates all points for all fixtures.
Returns: `Promise<RecalculationResult>`

#### `updateUsersLeagueTable(userIds: string[])`

Updates league table entries for specific users.
Returns: `Promise<number>` (number of users updated)

### Usage Examples

#### In a Server Load Function

```typescript
import { useRecalculation } from './hooks/recalculateHooks.svelte';

export const load = async ({ locals, url }) => {
	const selectedOrganizationId = url.searchParams.get('organization');
	const { processRecentFixtures } = useRecalculation(selectedOrganizationId);

	try {
		const result = await processRecentFixtures();
		console.log(`Processed ${result.processedFixtures} fixtures`);
	} catch (error) {
		console.error('Error processing fixtures:', error);
	}

	// ... rest of load function
};
```

#### In a Component (for admin actions)

```typescript
import { useRecalculation } from './hooks/recalculateHooks.svelte';

export function AdminPanel() {
	const organizationId = 'org-123';
	const { recalculateAll, processRecentFixtures } = useRecalculation(organizationId);

	async function handleRecalculateAll() {
		try {
			const result = await recalculateAll();
			console.log('Recalculation complete:', result);
		} catch (error) {
			console.error('Recalculation failed:', error);
		}
	}

	// ... component logic
}
```

## Standalone Exports

For backward compatibility, the following functions are also exported directly:

- `processRecentFixtures()`: Standalone version of the recent fixtures processor
- `recalculateAllPoints()`: Standalone version of the full recalculation

### Types

```typescript
interface RecalculationResult {
	processedFixtures: number;
	processedPredictions: number;
	updatedUsers: number;
}
```
