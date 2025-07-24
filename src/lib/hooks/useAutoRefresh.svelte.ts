import { invalidate } from '$app/navigation';

interface UseAutoRefreshOptions {
	interval?: number;
	invalidateKey?: string;
	onRefresh?: () => Promise<void> | void;
}

/**
 * Hook for managing auto-refresh functionality
 * @param options Configuration options for auto-refresh
 * @returns Object with refresh controls and state
 */
export function useAutoRefresh(options: UseAutoRefreshOptions = {}) {
	const { interval = 60000, invalidateKey, onRefresh } = options;

	let isRefreshing = $state(false);
	let isAutoRefreshEnabled = $state(false);
	let lastRefreshTime = $state(new Date().toLocaleString());

	// Auto-refresh effect
	$effect(() => {
		let timer: NodeJS.Timeout | null = null;

		if (isAutoRefreshEnabled) {
			timer = setInterval(refresh, interval);
		}

		// Cleanup
		return () => {
			if (timer) {
				clearInterval(timer);
			}
		};
	});

	async function refresh() {
		if (isRefreshing) return;

		isRefreshing = true;
		try {
			if (onRefresh) {
				await onRefresh();
			} else if (invalidateKey) {
				await invalidate(invalidateKey);
			}
			lastRefreshTime = new Date().toLocaleString();
		} catch (error) {
			console.error('Failed to refresh:', error);
		} finally {
			isRefreshing = false;
		}
	}

	function toggleAutoRefresh() {
		isAutoRefreshEnabled = !isAutoRefreshEnabled;
	}

	return {
		// State
		get isRefreshing() {
			return isRefreshing;
		},
		get isAutoRefreshEnabled() {
			return isAutoRefreshEnabled;
		},
		get lastRefreshTime() {
			return lastRefreshTime;
		},

		// Actions
		refresh,
		toggleAutoRefresh
	};
}
