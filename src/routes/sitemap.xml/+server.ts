// /src/routes/sitemap.xml/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import * as sitemap from 'super-sitemap';

export const prerender = true;

export const GET: RequestHandler = async () => {
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
		]
	});
};
