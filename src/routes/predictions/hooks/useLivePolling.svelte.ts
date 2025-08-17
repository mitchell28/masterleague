/**
 * Enhanced hook for managing live predictions polling
 * Handles real-time updates with external API awareness and intelligent intervals
 */
export function useLivePolling(hasLiveFixtures: () => boolean, isCurrentWeek: () => boolean) {
	// Enhanced polling state
	let isPolling = $state(false);
	let pollingTimer: ReturnType<typeof setTimeout> | null = $state(null);
	let lastPollTime = $state(new Date());
	let isUpdating = $state(false);
	let updateFailed = $state(false);
	let apiCallsRemaining = $state(10);
	let nextUpdateIn = $state(30000);
	let cacheStatus = $state<'fresh' | 'stale' | 'expired'>('fresh');
	let consecutiveFailures = $state(0);

	// Dynamic polling intervals based on context
	const POLLING_INTERVALS = {
		LIVE_AGGRESSIVE: 15000, // 15 seconds for live matches with high API quota
		LIVE_CONSERVATIVE: 30000, // 30 seconds for live matches with low API quota
		ACTIVE_WEEK: 60000, // 1 minute for current week non-live
		BACKGROUND: 300000, // 5 minutes for background updates
		ERROR_BACKOFF: 120000 // 2 minutes after errors
	};

	// Start enhanced polling for live fixtures
	function startPolling() {
		if (isPolling) return;

		isPolling = true;
		isUpdating = false;
		updateFailed = false;
		consecutiveFailures = 0;

		// Enhanced polling function with intelligent intervals
		const poll = async () => {
			if (!isPolling) return;

			try {
				isUpdating = true;

				// Use new predictions live-update API
				const response = await fetch('/api/predictions/live-update', {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (!response.ok) {
					throw new Error(`API response: ${response.status}`);
				}

				const data = await response.json();

				// Update state from API response
				lastPollTime = new Date();
				updateFailed = false;
				consecutiveFailures = 0;
				apiCallsRemaining = data.apiCallsRemaining || 10;
				nextUpdateIn = data.nextUpdateIn || 30000;
				cacheStatus = data.cacheStatus || 'fresh';

				// Log successful update in development
				if (process.env.NODE_ENV === 'development') {
					console.log(
						`Live polling update: ${data.liveFixtures?.length || 0} live fixtures, ${apiCallsRemaining} API calls remaining`
					);
				}
			} catch (error) {
				console.error('Enhanced live polling failed:', error);
				updateFailed = true;
				consecutiveFailures++;
				cacheStatus = 'expired';
			} finally {
				isUpdating = false;
			}

			// Calculate next poll interval intelligently
			const nextInterval = calculateNextPollInterval();

			// Schedule next poll if still needed
			if (isPolling && (hasLiveFixtures() || isCurrentWeek())) {
				pollingTimer = setTimeout(poll, nextInterval);
			} else {
				stopPolling();
			}
		};

		// Start first poll immediately for live matches, with delay for others
		const initialDelay = hasLiveFixtures() ? 100 : 1000;
		pollingTimer = setTimeout(poll, initialDelay);
	}

	// Stop polling
	function stopPolling() {
		isPolling = false;

		if (pollingTimer) {
			clearTimeout(pollingTimer);
			pollingTimer = null;
		}

		isUpdating = false;
	}

	// Calculate next poll interval based on current context
	function calculateNextPollInterval(): number {
		// Use API-provided interval if available and reasonable
		if (nextUpdateIn > 0 && nextUpdateIn < 600000) {
			// Max 10 minutes
			return nextUpdateIn;
		}

		// Error backoff - increase interval after consecutive failures
		if (consecutiveFailures > 0) {
			const backoffMultiplier = Math.min(consecutiveFailures, 4); // Max 4x backoff
			return POLLING_INTERVALS.ERROR_BACKOFF * backoffMultiplier;
		}

		// Live matches - aggressive or conservative based on API quota
		if (hasLiveFixtures()) {
			if (apiCallsRemaining > 5) {
				return POLLING_INTERVALS.LIVE_AGGRESSIVE;
			} else {
				return POLLING_INTERVALS.LIVE_CONSERVATIVE;
			}
		}

		// Current week but no live matches
		if (isCurrentWeek()) {
			return POLLING_INTERVALS.ACTIVE_WEEK;
		}

		// Background polling for inactive periods
		return POLLING_INTERVALS.BACKGROUND;
	}

	// Force refresh with API call
	async function forceRefresh(): Promise<void> {
		if (isUpdating) return;

		try {
			isUpdating = true;
			updateFailed = false;

			const response = await fetch('/api/predictions/live-update', {
				method: 'POST', // Force refresh endpoint
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(`Force refresh failed: ${response.status}`);
			}

			const data = await response.json();

			// Update state
			lastPollTime = new Date();
			apiCallsRemaining = data.apiCallsRemaining || 0;
			nextUpdateIn = data.nextUpdateIn || 30000;
			cacheStatus = 'fresh';
			consecutiveFailures = 0;

			console.log('Force refresh completed successfully');
		} catch (error) {
			console.error('Force refresh failed:', error);
			updateFailed = true;
			consecutiveFailures++;
		} finally {
			isUpdating = false;
		}
	}

	// Update polling state based on conditions
	function updatePollingState() {
		const shouldPoll = hasLiveFixtures() || isCurrentWeek();

		if (shouldPoll && !isPolling) {
			// Delay start based on priority
			const startDelay = hasLiveFixtures() ? 100 : 1000;
			setTimeout(startPolling, startDelay);
		} else if (!shouldPoll && isPolling) {
			stopPolling();
		}
	}

	// Get polling status information
	function getPollingStatus() {
		return {
			isActive: isPolling,
			isUpdating,
			updateFailed,
			lastUpdate: lastPollTime,
			nextUpdateIn,
			apiCallsRemaining,
			cacheStatus,
			consecutiveFailures,
			interval: calculateNextPollInterval()
		};
	}

	// Cleanup on destroy
	function cleanup() {
		stopPolling();
	}

	return {
		// State
		get isPolling() {
			return isPolling;
		},
		get lastPollTime() {
			return lastPollTime;
		},
		get isUpdating() {
			return isUpdating;
		},
		get updateFailed() {
			return updateFailed;
		},
		get apiCallsRemaining() {
			return apiCallsRemaining;
		},
		get nextUpdateIn() {
			return nextUpdateIn;
		},
		get cacheStatus() {
			return cacheStatus;
		},
		get consecutiveFailures() {
			return consecutiveFailures;
		},

		// Methods
		startPolling,
		stopPolling,
		forceRefresh,
		updatePollingState,
		getPollingStatus,
		cleanup
	};
}
