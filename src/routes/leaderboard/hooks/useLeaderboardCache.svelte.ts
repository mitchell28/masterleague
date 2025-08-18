/**
 * Hook for managing leaderboard time formatting
 * Simplified to remove cache status indicators
 */
export function useLeaderboardCache() {
	// Helper function for time formatting
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

	// Simplified - always show as fresh since we use direct DB queries
	function getCacheStatus(leaderboardMeta: any) {
		return { status: 'live', color: 'text-green-400' };
	}

	return {
		formatLastUpdate,
		getCacheStatus
	};
}
