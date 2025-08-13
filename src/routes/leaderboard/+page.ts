import type { PageLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';

export const load: PageLoad = ({ url }) => {
	const pageMetaTags = Object.freeze({
		title: 'Leaderboard',
		description:
			'View the current leaderboard standings and see how you rank against other players in your prediction groups.',
		canonical: new URL(url.pathname, url.origin).href,
		openGraph: {
			title: 'Leaderboard - Master League',
			description:
				'View the current leaderboard standings and see how you rank against other players in your prediction groups.',
			url: new URL(url.pathname, url.origin).href
		},
		twitter: {
			title: 'Leaderboard - Master League',
			description:
				'View the current leaderboard standings and see how you rank against other players in your prediction groups.'
		}
	}) satisfies MetaTagsProps;

	return {
		pageMetaTags
	};
};
