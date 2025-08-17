/**
 * Hook for managing leaderboard filtering and search
 * Handles search query state and filtering logic
 */
export function useLeaderboardFilter(getLeaderboard: () => any[]) {
	let searchQuery = $state('');

	// Filtered data based on search query
	const filteredData = $derived(() => {
		const leaderboard = getLeaderboard();
		if (!leaderboard) return [];

		if (!searchQuery.trim()) return leaderboard;

		const query = searchQuery.toLowerCase().trim();
		return leaderboard.filter((entry: any) => {
			const name = (entry.userName || '').toLowerCase();
			return name.includes(query);
		});
	});

	// Clear search
	function clearSearch() {
		searchQuery = '';
	}

	// Set search query
	function setSearchQuery(query: string) {
		searchQuery = query;
	}

	return {
		get searchQuery() {
			return searchQuery;
		},
		set searchQuery(value: string) {
			searchQuery = value;
		},
		get filteredData() {
			return filteredData();
		},
		clearSearch,
		setSearchQuery
	};
}
