interface UseSortingOptions {
	defaultSortKey?: string;
	defaultSortDirection?: 'asc' | 'desc';
}

/**
 * Generic hook for managing sorting functionality
 * @param data Array of data to sort
 * @param options Configuration options for sorting
 * @returns Object with sorting state and utilities
 */
export function useSorting<T extends Record<string, any>>(
	data: T[],
	options: UseSortingOptions = {}
) {
	const { defaultSortKey = '', defaultSortDirection = 'desc' } = options;

	let sortKey = $state<string>(defaultSortKey);
	let sortDirection = $state<'asc' | 'desc'>(defaultSortDirection);

	// Sorted data
	let sortedData = $derived(() => {
		if (!sortKey) return data;

		return [...data].sort((a, b) => {
			const valueA = a[sortKey];
			const valueB = b[sortKey];

			// Handle null/undefined values
			if (valueA == null && valueB == null) return 0;
			if (valueA == null) return sortDirection === 'desc' ? 1 : -1;
			if (valueB == null) return sortDirection === 'desc' ? -1 : 1;

			// Handle string values
			if (typeof valueA === 'string' && typeof valueB === 'string') {
				return sortDirection === 'desc'
					? valueB.localeCompare(valueA)
					: valueA.localeCompare(valueB);
			}

			// Handle date values
			if (valueA instanceof Date && valueB instanceof Date) {
				return sortDirection === 'desc'
					? valueB.getTime() - valueA.getTime()
					: valueA.getTime() - valueB.getTime();
			}

			// Handle numeric values
			const numA = Number(valueA);
			const numB = Number(valueB);

			if (!isNaN(numA) && !isNaN(numB)) {
				return sortDirection === 'desc' ? numB - numA : numA - numB;
			}

			// Fallback to string comparison
			return sortDirection === 'desc'
				? String(valueB).localeCompare(String(valueA))
				: String(valueA).localeCompare(String(valueB));
		});
	});

	function toggleSort(key: string) {
		if (sortKey === key) {
			sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
		} else {
			sortKey = key;
			sortDirection = defaultSortDirection;
		}
	}

	function setSorting(key: string, direction: 'asc' | 'desc') {
		sortKey = key;
		sortDirection = direction;
	}

	function resetSort() {
		sortKey = defaultSortKey;
		sortDirection = defaultSortDirection;
	}

	function clearSort() {
		sortKey = '';
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
		setSorting,
		resetSort,
		clearSort
	};
}
