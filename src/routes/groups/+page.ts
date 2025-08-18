import type { PageLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';

export const load: PageLoad = ({ url }) => {
	// Only override specific meta tags - layout defaults will be used for the rest
	const pageMetaTags = Object.freeze({
		title: 'Groups',
		description:
			'Join or create prediction groups with your friends. Compete in private leagues and climb the leaderboards.',
		canonical: new URL(url.pathname, url.origin).href,
		openGraph: {
			title: 'Groups - Master League',
			description:
				'Join or create prediction groups with your friends. Compete in private leagues and climb the leaderboards.',
			url: new URL(url.pathname, url.origin).href
			// Note: openGraph.images, siteName, etc. will inherit from layout.ts
		},
		twitter: {
			title: 'Groups - Master League',
			description:
				'Join or create prediction groups with your friends. Compete in private leagues and climb the leaderboards.'
			// Note: twitter.image, imageAlt, etc. will inherit from layout.ts
		}
	}) satisfies MetaTagsProps;

	return {
		pageMetaTags
	};
};
