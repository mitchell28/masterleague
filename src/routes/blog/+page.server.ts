import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { postsQuery, type Post } from '$lib/sanity/lib/queries';
import type { MetaTagsProps } from 'svelte-meta-tags';

const POSTS_PER_PAGE = 3;

export const load: PageServerLoad = async ({ url, locals }) => {
	const { loadQuery } = locals;
	const page = parseInt(url.searchParams.get('page') || '1');

	if (page < 1 || isNaN(page)) {
		throw error(404, 'Page not found');
	}

	// Load all posts from Sanity
	const allPostsData = await loadQuery<Post[]>(postsQuery, {});
	const allPosts = allPostsData.data || [];

	// Additional client-side sorting to ensure proper order (newest first)
	const sortedPosts = allPosts.sort((a, b) => {
		const dateA = new Date(a.publishedAt || a._createdAt);
		const dateB = new Date(b.publishedAt || b._createdAt);
		return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
	});

	const totalPosts = sortedPosts.length;
	const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

	if (page > totalPages && totalPages > 0) {
		throw error(404, 'Page not found');
	}

	const startIndex = (page - 1) * POSTS_PER_PAGE;
	const endIndex = startIndex + POSTS_PER_PAGE;
	const posts = sortedPosts.slice(startIndex, endIndex);

	// Meta tags for SEO
	const pageMetaTags = Object.freeze({
		title: 'Blog - Master League',
		description: 'Explore the latest posts and updates from the Master League community.',
		canonical: new URL(url.pathname, url.origin).href,
		openGraph: {
			title: 'Blog - Master League',
			description: 'Explore the latest posts and updates from the Master League community.',
			url: new URL(url.pathname, url.origin).href
			// Note: openGraph.images, siteName, etc. will inherit from layout.ts
		},
		twitter: {
			title: 'Blog - Master League',
			description: 'Explore the latest posts and updates from the Master League community.'
			// Note: twitter.image, imageAlt, etc. will inherit from layout.ts
		}
	}) satisfies MetaTagsProps;

	return {
		posts,
		pagination: {
			currentPage: page,
			totalPages,
			totalPosts,
			hasNextPage: page < totalPages,
			hasPrevPage: page > 1,
			nextPage: page < totalPages ? page + 1 : null,
			prevPage: page > 1 ? page - 1 : null
		},
		pageMetaTags
	};
};
