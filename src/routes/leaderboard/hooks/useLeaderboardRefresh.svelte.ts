import { goto, invalidateAll } from '$app/navigation';
import { browser } from '$app/environment';

/**
 * Simplified hook for managing leaderboard updates
 * Combines force refresh and regular refresh into one update function
 */
export function useLeaderboardRefresh(organizationId: string, season: string) {
	let isUpdating = $state(false);
	let lastUpdateTime = $state<Date | null>(null);

	// Simplified update function that always refreshes data
	async function updateLeaderboard() {
		if (isUpdating) return;

		isUpdating = true;
		lastUpdateTime = new Date();

		try {
			// Call the API to trigger a refresh
			const response = await fetch('/api/update-leaderboard', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					organizationId,
					season,
					force: true, // Always force refresh for simplicity
					triggeredBy: 'manual-ui'
				})
			});

			if (!response.ok) {
				throw new Error('Failed to update leaderboard');
			}

			const result = await response.json();
			console.log('Leaderboard update result:', result);

			// Invalidate the page data to reload from server
			await invalidateAll();
		} catch (error) {
			console.error('Failed to update leaderboard:', error);
		} finally {
			isUpdating = false;
		}
	}

	// Navigate to user predictions
	function viewUserPredictions(userId: string, currentWeek: number) {
		goto(`/leaderboard/${userId}/${currentWeek}`);
	}

	return {
		get isUpdating() {
			return isUpdating;
		},
		get lastUpdateTime() {
			return lastUpdateTime;
		},
		updateLeaderboard,
		viewUserPredictions
	};
}
