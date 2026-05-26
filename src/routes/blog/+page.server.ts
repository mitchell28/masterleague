import type { PageServerLoad } from './$types';
import { postsQuery, type Post } from '$lib/sanity/lib/queries';
import type { MetaTagsProps } from 'svelte-meta-tags';

export const load: PageServerLoad = async ({ url, locals }) => {
	const { loadQuery } = locals;

	// Load all posts from Sanity
	const allPostsData = await loadQuery<Post[]>(postsQuery, {});
	const allPosts = allPostsData.data || [];

	// Sort newest first
	const sortedPosts = allPosts.sort((a, b) => {
		const dateA = new Date(a.publishedAt || a._createdAt);
		const dateB = new Date(b.publishedAt || b._createdAt);
		return dateB.getTime() - dateA.getTime();
	});

	// Meta tags for SEO
	const pageMetaTags = Object.freeze({
		title: 'Blog - Master League',
		description: 'Explore the latest posts and updates from the Master League community.',
		canonical: new URL(url.pathname, url.origin).href,
		openGraph: {
			title: 'Blog - Master League',
			description: 'Explore the latest posts and updates from the Master League community.',
			url: new URL(url.pathname, url.origin).href
		},
		twitter: {
			title: 'Blog - Master League',
			description: 'Explore the latest posts and updates from the Master League community.'
		}
	}) satisfies MetaTagsProps;

	return {
		posts: sortedPosts,
		pageMetaTags
	};
};
