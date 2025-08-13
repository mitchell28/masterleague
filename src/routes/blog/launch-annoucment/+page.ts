import type { PageLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';
import blogImage from './assets/blog-1.png';

export const load: PageLoad = ({ url }) => {
	// Only override specific meta tags - layout defaults will be used for the rest
	const pageMetaTags = Object.freeze({
		title: 'The Pitch is Ready',
		description:
			"We're delighted to announce that the official Master League website is now live! Learn about our journey from 2003 to today and what's new.",
		canonical: new URL(url.pathname, url.origin).href,
		openGraph: {
			title: 'The Pitch is Ready - Master League Blog',
			description:
				"We're delighted to announce that the official Master League website is now live! Learn about our journey from 2003 to today and what's new.",
			url: new URL(url.pathname, url.origin).href,
			images: [
				{
					url: new URL(blogImage, url.origin).href,
					alt: 'The Pitch is Ready - Master League Launch Announcement'
				}
			]
			// Note: openGraph.siteName, etc. will inherit from layout.ts
		},
		twitter: {
			title: 'The Pitch is Ready - Master League',
			description:
				"Master League website is now live! Read about our journey from pen and paper in 2003 to today's digital platform.",
			image: new URL(blogImage, url.origin).href,
			imageAlt: 'The Pitch is Ready - Master League Launch Announcement'
			// Note: other twitter properties will inherit from layout.ts
		}
	}) satisfies MetaTagsProps;

	return {
		pageMetaTags
	};
};
