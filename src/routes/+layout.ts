import type { MetaTagsProps } from 'svelte-meta-tags';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ url }) => {
	const baseMetaTags = Object.freeze({
		title: 'Home',
		titleTemplate: '%s | Master League',
		description:
			'Master League - The ultimate prediction league platform for sports enthusiasts. Create groups, make predictions, and compete with friends.',
		canonical: new URL(url.pathname, url.origin).href,
		robots: 'index,follow',
		keywords: ['sports', 'predictions', 'league', 'competition', 'groups', 'leaderboard'],
		openGraph: {
			type: 'website',
			url: new URL(url.pathname, url.origin).href,
			locale: 'en_US',
			title: 'Master League - Sports Prediction Platform',
			description:
				'Master League - The ultimate prediction league platform for sports enthusiasts. Create groups, make predictions, and compete with friends.',
			siteName: 'Master League',
			images: [
				{
					url: new URL('/ogimage/Master-League-OG.png', url.origin).href,
					alt: 'Master League - Sports Prediction Platform',
					width: 1200,
					height: 630,
					secureUrl: new URL('/ogimage/Master-League-OG.png', url.origin).href,
					type: 'image/png'
				}
			]
		},
		twitter: {
			cardType: 'summary_large_image' as const,
			site: '@masterleague',
			creator: '@masterleague',
			title: 'Master League - Sports Prediction Platform',
			description:
				'The ultimate prediction league platform for sports enthusiasts. Create groups, make predictions, and compete with friends.',
			image: new URL('/ogimage/Master-League-OG.png', url.origin).href,
			imageAlt: 'Master League - Sports Prediction Platform'
		},
		additionalMetaTags: [
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1'
			},
			{
				name: 'theme-color',
				content: '#2EFF9B'
			},
			{
				name: 'author',
				content: 'Master League'
			},
			{
				name: 'application-name',
				content: 'Master League'
			}
		],
		additionalLinkTags: [
			{
				rel: 'icon',
				href: '/favicon.ico'
			},
			{
				rel: 'apple-touch-icon',
				href: '/apple-touch-icon.png'
			}
		]
	}) satisfies MetaTagsProps;

	return {
		baseMetaTags
	};
};
