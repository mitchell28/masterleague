interface LeaderboardEntry {
	id: string;
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
 * @param options Configuration options for sorting
 * @returns Object with sorting state and utilities
 */
export function useLeaderboardSorting(data: LeaderboardEntry[], options: UseSortingOptions = {}) {
	const { defaultSortKey = 'totalPoints', defaultSortDirection = 'desc' } = options;

	let sortKey = $state<string>(defaultSortKey);
	let sortDirection = $state<'asc' | 'desc'>(defaultSortDirection);

	// Sorted data with leaderboard-specific logic
	let sortedData = $derived(() => {
		return [...data].sort((a, b) => {
			// Special case for totalPoints - include tiebreakers
			if (sortKey === 'totalPoints') {
				if (a.totalPoints !== b.totalPoints) {
					return sortDirection === 'desc'
						? b.totalPoints - a.totalPoints
						: a.totalPoints - b.totalPoints;
				}
				// First tiebreaker: correct scorelines
				if (a.correctScorelines !== b.correctScorelines) {
					return sortDirection === 'desc'
						? b.correctScorelines - a.correctScorelines
						: a.correctScorelines - b.correctScorelines;
				}
				// Second tiebreaker: correct outcomes
				return sortDirection === 'desc'
					? b.correctOutcomes - a.correctOutcomes
					: a.correctOutcomes - b.correctOutcomes;
			}

			// For other columns, do standard sorting
			const valueA = a[sortKey as keyof typeof a];
			const valueB = b[sortKey as keyof typeof b];

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
			return sortedData;
		},

		// Actions
		toggleSort,
		resetSort
	};
}
