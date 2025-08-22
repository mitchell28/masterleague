import type { Post } from '$lib/sanity/lib/queries';

interface UseBlogPaginationOptions {
	postsPerPage?: number;
	initialPage?: number;
}

/**
 * Hook for managing frontend blog pagination
 * @param posts Array of all blog posts
 * @param options Configuration options for pagination
 * @returns Object with pagination state and controls
 */
export function useBlogPagination(
	posts: Post[] | undefined,
	options: UseBlogPaginationOptions = {}
) {
	const { postsPerPage = 3, initialPage = 1 } = options;

	let currentPage = $state(initialPage);

	// Derived pagination values
	let totalPosts = $derived(() => posts?.length || 0);
	let totalPages = $derived(() => Math.ceil(totalPosts() / postsPerPage));
	let startIndex = $derived(() => (currentPage - 1) * postsPerPage);
	let endIndex = $derived(() => startIndex() + postsPerPage);

	// Current page posts
	let paginatedPosts = $derived(() => {
		if (!posts) return [];
		return posts.slice(startIndex(), endIndex());
	});

	// Pagination state
	let hasNextPage = $derived(() => currentPage < totalPages());
	let hasPrevPage = $derived(() => currentPage > 1);
	let nextPage = $derived(() => (hasNextPage() ? currentPage + 1 : null));
	let prevPage = $derived(() => (hasPrevPage() ? currentPage - 1 : null));

	// Navigation functions
	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages()) {
			currentPage = page;
		}
	}

	function goToNextPage() {
		if (hasNextPage()) {
			currentPage += 1;
		}
	}

	function goToPrevPage() {
		if (hasPrevPage()) {
			currentPage -= 1;
		}
	}

	function goToFirstPage() {
		currentPage = 1;
	}

	function goToLastPage() {
		if (totalPages() > 0) {
			currentPage = totalPages();
		}
	}

	// Reset to first page when posts change
	$effect(() => {
		if (posts && currentPage > totalPages() && totalPages() > 0) {
			currentPage = 1;
		}
	});

	return {
		// State
		get currentPage() {
			return currentPage;
		},
		get totalPages() {
			return totalPages();
		},
		get totalPosts() {
			return totalPosts();
		},
		get paginatedPosts() {
			return paginatedPosts();
		},
		get hasNextPage() {
			return hasNextPage();
		},
		get hasPrevPage() {
			return hasPrevPage();
		},
		get nextPage() {
			return nextPage();
		},
		get prevPage() {
			return prevPage();
		},
		get postsPerPage() {
			return postsPerPage;
		},

		// Actions
		goToPage,
		goToNextPage,
		goToPrevPage,
		goToFirstPage,
		goToLastPage
	};
}
