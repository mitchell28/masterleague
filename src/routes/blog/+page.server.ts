import type { PageServerLoad } from './$types';
import { postsQuery, type Post } from '$lib/sanity/lib/queries';
import type { MetaTagsProps } from 'svelte-meta-tags';

export const load: PageServerLoad = async ({ url, locals }) => {
	const { loadQuery } = locals;

	console.log('Blog page load - URL:', url.pathname);

	// Load all posts from Sanity
	const allPostsData = await loadQuery<Post[]>(postsQuery, {});
	const allPosts = allPostsData.data || [];

	// Sort posts to ensure proper order (newest first)
	const sortedPosts = allPosts.sort((a, b) => {
		const dateA = new Date(a.publishedAt || a._createdAt);
		const dateB = new Date(b.publishedAt || b._createdAt);
		return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
	});

	console.log('Blog load - Total posts:', sortedPosts.length);

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
		posts: sortedPosts,
		pageMetaTags
	};
};
