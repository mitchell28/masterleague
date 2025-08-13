import type { PageLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';
import blogImage from './assets/how-to-sign-up.png';

export const load: PageLoad = ({ url }) => {
	// Only override specific meta tags - layout defaults will be used for the rest
	const pageMetaTags = Object.freeze({
		title: 'How to Sign Up to Master League',
		description:
			'A simple step-by-step guide to get you started with Master League. Learn how to sign up, pay your entry fee, and join the competition.',
		canonical: new URL(url.pathname, url.origin).href,
		openGraph: {
			title: 'How to Sign Up to Master League - Blog',
			description:
				'A simple step-by-step guide to get you started with Master League. Learn how to sign up, pay your entry fee, and join the competition.',
			url: new URL(url.pathname, url.origin).href,
			images: [
				{
					url: new URL(blogImage, url.origin).href,
					alt: 'How to Sign Up to Master League - Step by Step Guide'
				}
			]
			// Note: openGraph.siteName, etc. will inherit from layout.ts
		},
		twitter: {
			title: 'How to Sign Up to Master League',
			description:
				"Step-by-step guide to joining Master League. Pay £30 entry fee, sign up, verify email, and you're ready to compete!",
			image: new URL(blogImage, url.origin).href,
			imageAlt: 'How to Sign Up to Master League - Step by Step Guide'
			// Note: other twitter properties will inherit from layout.ts
		}
	}) satisfies MetaTagsProps;

	return {
		pageMetaTags
	};
};
