/**
 * Hook for managing leaderboard cache status and time formatting
 * Provides cache status indicators and time formatting utilities
 */
export function useLeaderboardCache() {
	// Helper functions for time formatting
	function formatLastUpdate(dateString: string | null) {
		if (!dateString) return 'Never';
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;

		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;

		return date.toLocaleDateString();
	}

	function getCacheStatus(leaderboardMeta: any) {
		if (!leaderboardMeta) return { status: 'unknown', color: 'text-slate-400' };

		if (leaderboardMeta.isCalculating) {
			return { status: 'calculating', color: 'text-yellow-400' };
		}

		const lastUpdate = leaderboardMeta.lastLeaderboardUpdate
			? new Date(leaderboardMeta.lastLeaderboardUpdate)
			: null;
		if (!lastUpdate) {
			return { status: 'no data', color: 'text-red-400' };
		}

		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
		if (lastUpdate < fiveMinutesAgo) {
			return { status: 'stale', color: 'text-orange-400' };
		}

		return { status: 'fresh', color: 'text-green-400' };
	}

	return {
		formatLastUpdate,
		getCacheStatus
	};
}
