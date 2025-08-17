import { invalidate } from '$app/navigation';
import type { PredictionsFixture } from './usePredictionsState.svelte';

/**
 * Hook for managing live fixture polling and updates
 */
export function usePredictionsPolling(state: any, derived: any, weekParam: () => string) {
	// Polling configuration
	const POLL_MINIMUM_INTERVAL = 5000; // 5 seconds minimum between polls
	const POLL_INTERVAL = 30000; // 30 seconds between automatic polls

	let lastPollRequest = 0;

	// Update polling state based on conditions
	function updatePollingState() {
		if (derived.hasLiveFixtures && derived.isCurrentWeek && !state.isPolling) {
			// Delay start to reduce initial load impact
			setTimeout(startPolling, 1000);
		} else if ((!derived.hasLiveFixtures || !derived.isCurrentWeek) && state.isPolling) {
			stopPolling();
		}
	}

	// Poll for fixture updates
	async function pollFixtureUpdates() {
		// Skip if already updating or no live fixtures
		if (state.isUpdating || !derived.hasLiveFixtures || !derived.isCurrentWeek) {
			return;
		}

		// Rate limit polling
		const now = Date.now();
		if (now - lastPollRequest < POLL_MINIMUM_INTERVAL) {
			return;
		}
		lastPollRequest = now;

		state.isUpdating = true;
		state.updateFailed = false;

		try {
			// Create form data with live fixture IDs
			const formData = new FormData();
			const liveFixtureIds = state.fixtures
				.filter((f: PredictionsFixture) => f.isLive)
				.map((f: PredictionsFixture) => f.id);

			formData.append('fixtureIds', JSON.stringify(liveFixtureIds));

			// Call the form action
			const response = await fetch(`?/updateFixtures`, {
				method: 'POST',
				body: formData
			});

			// Invalidate the page data to get latest from server
			invalidate(`fixtures:${weekParam()}`);

			if (!response.ok) {
				throw new Error(`Failed to update fixtures: ${response.status}`);
			}
		} catch (error) {
			console.error('Error polling for fixture updates:', error);
			state.updateFailed = true;
		} finally {
			state.isUpdating = false;
		}
	}

	// Start polling for updates
	function startPolling() {
		if (state.isPolling) return;

		state.isPolling = true;
		// Poll immediately, then at intervals
		pollFixtureUpdates();
		state.pollingTimer = setInterval(() => {
			pollFixtureUpdates();
		}, POLL_INTERVAL);
	}

	// Stop polling for updates
	function stopPolling() {
		if (!state.isPolling) return;

		state.isPolling = false;
		if (state.pollingTimer) {
			clearInterval(state.pollingTimer);
			state.pollingTimer = null;
		}
	}

	// Force refresh the fixture data
	function manualRefresh() {
		if (state.isUpdating) return;
		pollFixtureUpdates();
	}

	// Cleanup function
	function cleanup() {
		stopPolling();
	}

	return {
		updatePollingState,
		startPolling,
		stopPolling,
		manualRefresh,
		cleanup
	};
}
