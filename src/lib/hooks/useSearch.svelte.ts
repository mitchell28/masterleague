interface UseSearchOptions<T> {
	searchFields?: (keyof T)[];
	initialQuery?: string;
}

/**
 * Hook for managing search functionality
 * @param data Array of data to search through
 * @param options Configuration options for search
 * @returns Object with search state and filtered data
 */
export function useSearch<T extends Record<string, any>>(
	data: T[] | undefined,
	options: UseSearchOptions<T> = {}
) {
	const { searchFields, initialQuery = '' } = options;

	let searchQuery = $state(initialQuery);

	// Filtered data based on search query
	let filteredData = $derived(() => {
		if (!data || !searchQuery.trim()) return data || [];

		const query = searchQuery.toLowerCase().trim();

		return data.filter((item) => {
			// If specific fields are provided, search only those
			if (searchFields && searchFields.length > 0) {
				return searchFields.some((field) => {
					const value = item[field];
					return value && String(value).toLowerCase().includes(query);
				});
			}

			// Otherwise, search all string fields
			return Object.values(item).some((value) => {
				if (typeof value === 'string') {
					return value.toLowerCase().includes(query);
				}
				return false;
			});
		});
	});

	function clearSearch() {
		searchQuery = '';
	}

	return {
		// State
		get searchQuery() {
			return searchQuery;
		},
		set searchQuery(value: string) {
			searchQuery = value;
		},
		get filteredData() {
			return filteredData;
		},

		// Actions
		clearSearch
	};
}
