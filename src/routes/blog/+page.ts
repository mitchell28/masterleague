import type { PageLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';
import launchAnnouncementImage from './launch-annoucment/assets/blog-1.png';
import signUpGuideImage from './how-to-sign-up/assets/how-to-sign-up.png';

export const load: PageLoad = async ({ url }) => {
	// Only override specific meta tags - layout defaults will be used for the rest
	const pageMetaTags = Object.freeze({
		title: 'Blog',
		description:
			'Stay up to date with the latest Master League news, guides, and announcements. Learn how to sign up, get updates on new features, and more.',
		canonical: new URL(url.pathname, url.origin).href,
		openGraph: {
			title: 'Blog - Master League',
			description:
				'Stay up to date with the latest Master League news, guides, and announcements. Learn how to sign up, get updates on new features, and more.',
			url: new URL(url.pathname, url.origin).href
			// Note: openGraph.images, siteName, etc. will inherit from layout.ts
		},
		twitter: {
			title: 'Blog - Master League',
			description: 'Stay up to date with the latest Master League news, guides, and announcements.'
			// Note: twitter.image, imageAlt, etc. will inherit from layout.ts
		}
	}) satisfies MetaTagsProps;

	const blogPosts = [
		{
			id: 'launch-annoucment',
			title: 'The Pitch is Ready',
			subtitle: 'We are excited to announce the launch of our new platform!',
			excerpt:
				"We're delighted to announce that the official Master League website is now live! Master League started originally back in 2003, when everything was done by pen and paper...",
			date: 'August 13, 2025',
			category: 'RELEASE ANNOUNCEMENT',
			image: launchAnnouncementImage,
			slug: 'launch-annoucment'
		},
		{
			id: 'how-to-sign-up',
			title: 'How to Sign Up to Master League',
			subtitle: 'A simple step-by-step guide to get you started!',
			excerpt:
				'First of all, before signing up you must have paid your entry of £30 to the leader of the group or have spoken to them to let them know when you will pay...',
			date: 'August 13, 2025',
			category: 'HOW-TO GUIDE',
			image: signUpGuideImage,
			slug: 'how-to-sign-up'
		}
	];

	return {
		pageMetaTags,
		blogPosts
	};
};
