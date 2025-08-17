interface LeaderboardEntry {
	id: string;
	name?: string;
	totalPoints: number;
	correctScorelines: number;
	correctOutcomes: number;
	predictedFixtures: number;
	completedFixtures: number;
	lastUpdated?: string;
	[key: string]: any;
}

interface UseSortingOptions {
	defaultSortKey?: string;
	defaultSortDirection?: 'asc' | 'desc';
}

/**
 * Hook for managing leaderboard sorting with tiebreakers
 * @param getData Reactive getter for data to sort (can be filtered data)
 * @param options Configuration options for sorting
 * @returns Object with sorting state and utilities
 */
export function useLeaderboardSorting(
	getData: () => LeaderboardEntry[],
	options: UseSortingOptions = {}
) {
	const { defaultSortKey = 'totalPoints', defaultSortDirection = 'desc' } = options;

	let sortKey = $state<string>(defaultSortKey);
	let sortDirection = $state<'asc' | 'desc'>(defaultSortDirection);

	// Sorted data with leaderboard-specific logic
	const sortedData = $derived(() => {
		const data = getData();
		if (!data || data.length === 0) return [];

		return [...data].sort((a, b) => {
			// Special case for totalPoints - include tiebreakers
			if (sortKey === 'totalPoints') {
				const aPoints = a.totalPoints || 0;
				const bPoints = b.totalPoints || 0;

				if (aPoints !== bPoints) {
					return sortDirection === 'desc' ? bPoints - aPoints : aPoints - bPoints;
				}

				// First tiebreaker: correct scorelines
				const aScorelines = a.correctScorelines || 0;
				const bScorelines = b.correctScorelines || 0;
				if (aScorelines !== bScorelines) {
					return sortDirection === 'desc' ? bScorelines - aScorelines : aScorelines - bScorelines;
				}

				// Second tiebreaker: correct outcomes
				const aOutcomes = a.correctOutcomes || 0;
				const bOutcomes = b.correctOutcomes || 0;
				if (aOutcomes !== bOutcomes) {
					return sortDirection === 'desc' ? bOutcomes - aOutcomes : aOutcomes - bOutcomes;
				}

				// Final tiebreaker: alphabetical by name
				const aName = (a.userName || '').toLowerCase();
				const bName = (b.userName || '').toLowerCase();
				return aName.localeCompare(bName);
			}

			// For other columns, do standard sorting
			const valueA = a[sortKey] || (typeof a[sortKey] === 'number' ? 0 : '');
			const valueB = b[sortKey] || (typeof b[sortKey] === 'number' ? 0 : '');

			// Handle string values
			if (typeof valueA === 'string' && typeof valueB === 'string') {
				return sortDirection === 'desc'
					? valueB.localeCompare(valueA)
					: valueA.localeCompare(valueB);
			}

			// Handle numeric values
			return sortDirection === 'desc'
				? Number(valueB) - Number(valueA)
				: Number(valueA) - Number(valueB);
		});
	});

	function toggleSort(key: string) {
		if (sortKey === key) {
			sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
		} else {
			sortKey = key;
			sortDirection = 'desc';
		}
	}

	function resetSort() {
		sortKey = defaultSortKey;
		sortDirection = defaultSortDirection;
	}

	return {
		// State
		get sortKey() {
			return sortKey;
		},
		get sortDirection() {
			return sortDirection;
		},
		get sortedData() {
			return sortedData();
		},

		// Actions
		toggleSort,
		resetSort
	};
}
