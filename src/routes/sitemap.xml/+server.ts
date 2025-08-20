// /src/routes/sitemap.xml/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import * as sitemap from 'super-sitemap';
import { client } from '$lib/sanity/lib/client';
import { postsQuery, type Post } from '$lib/sanity/lib/queries';

export const prerender = true;

export const GET: RequestHandler = async () => {
	// Fetch all blog posts to get their slugs
	const posts = await client.fetch<Post[]>(postsQuery);
	const blogSlugs = posts.map((post) => post.slug.current).filter(Boolean);

	return await sitemap.response({
		origin: 'https://masterleague.app',
		excludeRoutePatterns: [
			'^/auth/(?!login$|signup$).*', // Exclude auth routes except login and signup
			'^/api/.*',
			'^/leaderboard/.*',
			'^/predictions/\\[week\\]$',
			'.*\\(authenticated\\).*',
			'.*studio.*', // Exclude Sanity studio routes (simple pattern)
			'.*/studio/\\[\\.\\.\\.*\\].*' // Exclude Sanity studio catchall routes (specific pattern)
		],
		paramValues: {
			'/blog/[slug]': blogSlugs
		}
	});
};
