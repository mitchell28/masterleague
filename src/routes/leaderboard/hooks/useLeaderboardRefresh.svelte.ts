import { goto, invalidateAll } from '$app/navigation';
import { browser } from '$app/environment';
import { onMount } from 'svelte';

/**
 * Hook for managing leaderboard refresh functionality
 * Handles manual refresh, force refresh, and API calls with cron awareness
 */
export function useLeaderboardRefresh(organizationId: string, season: string) {
	let isManualRefreshing = $state(false);
	let lastRefreshTime = $state<Date | null>(null);
	let cronStatus = $state<'healthy' | 'stale' | 'unknown'>('unknown');

	// Check cron health status (client-side only)
	async function checkCronHealth() {
		if (!browser) return;

		try {
			const response = await fetch(`/api/cron/health?jobType=leaderboard-${organizationId}`);
			if (response.ok) {
				const health = await response.json();
				cronStatus = health.status || 'unknown';
			}
		} catch (error) {
			console.warn('Could not check cron health:', error);
			cronStatus = 'unknown';
		}
	}

	// Manual refresh function with cron coordination
	async function refreshLeaderboard(force = false) {
		if (isManualRefreshing) return;

		isManualRefreshing = true;
		lastRefreshTime = new Date();

		try {
			// Check if cron recently updated (unless forcing)
			if (!force && cronStatus === 'healthy') {
				console.log('⏭️ Skipping manual refresh - cron jobs are healthy');
				await invalidateAll(); // Still reload the page data
				return;
			}

			// Call the API to trigger a refresh
			const response = await fetch('/api/update-leaderboard', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					organizationId,
					season,
					force,
					triggeredBy: 'manual-ui'
				})
			});

			if (!response.ok) {
				throw new Error('Failed to refresh leaderboard');
			}

			const result = await response.json();
			console.log('Leaderboard refresh result:', result);

			// Update cron status based on result
			if (result.success) {
				cronStatus = 'healthy';
			}

			// Invalidate the page data to reload from server
			await invalidateAll();
		} catch (error) {
			console.error('Failed to refresh leaderboard:', error);
			cronStatus = 'stale'; // Mark as stale if manual refresh fails
		} finally {
			isManualRefreshing = false;
		}
	}

	// Navigate to user predictions
	function viewUserPredictions(userId: string, currentWeek: number) {
		goto(`/leaderboard/${userId}/${currentWeek}`);
	}

	// Initialize cron health check (client-side only)
	onMount(() => {
		checkCronHealth();
	});

	return {
		get isManualRefreshing() {
			return isManualRefreshing;
		},
		get lastRefreshTime() {
			return lastRefreshTime;
		},
		get cronStatus() {
			return cronStatus;
		},
		refreshLeaderboard,
		viewUserPredictions,
		checkCronHealth
	};
}
