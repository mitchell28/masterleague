import { postQuery as query, type Post } from '$lib/sanity/lib/queries';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';
import { urlFor } from '$lib/sanity/lib/image';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { loadQuery } = locals;
	const { slug } = params;

	// If this is a pagination request, redirect to main blog page
	if (url.searchParams.has('page')) {
		throw redirect(302, `/blog?${url.searchParams.toString()}`);
	}

	const sanityParams = { slug };

	try {
		const initial = await loadQuery<Post>(query, sanityParams);

		// If no post found from Sanity, redirect to main post page
		if (!initial.data) {
			throw redirect(302, '/blog');
		}

		const pageMetaTags = Object.freeze({
			title: initial.data.metaTitle || initial.data.title || 'Blog Post - Master League',
			description:
				initial.data.metaDescription ||
				initial.data.excerpt ||
				'Explore the latest posts and updates from the Master League community.',
			canonical: new URL(url.pathname, url.origin).href,
			openGraph: {
				title:
					initial.data.openGraphTitle ||
					initial.data.metaTitle ||
					initial.data.title ||
					'Blog - Master League',
				description:
					initial.data.openGraphDescription ||
					initial.data.metaDescription ||
					initial.data.excerpt ||
					'Explore the latest posts and updates from the Master League community.',
				url: new URL(url.pathname, url.origin).href,
				...(() => {
					const ogImage = initial.data.openGraphImage || initial.data.mainImage;
					if (ogImage) {
						return {
							images: [
								{
									url: urlFor(ogImage).width(1200).height(630).url(),
									width: 1200,
									height: 630,
									alt:
										(initial.data.openGraphImage as any)?.alt ||
										(initial.data.mainImage as any)?.alt ||
										initial.data.title ||
										''
								}
							]
						};
					}
					return {};
				})()
				// Note: openGraph.siteName, etc. will inherit from layout.ts
			},
			twitter: {
				title:
					initial.data.twitterTitle ||
					initial.data.openGraphTitle ||
					initial.data.metaTitle ||
					initial.data.title ||
					'Blog - Master League',
				description:
					initial.data.twitterDescription ||
					initial.data.openGraphDescription ||
					initial.data.metaDescription ||
					initial.data.excerpt ||
					'Explore the latest posts and updates from the Master League community.'
				// Note: twitter.image, imageAlt, etc. will inherit from layout.ts
			},
			...(initial.data.keywords && initial.data.keywords.length > 0
				? {
						keywords: initial.data.keywords
					}
				: {}),
			...(initial.data.noIndex
				? {
						robots: 'noindex, nofollow'
					}
				: {})
		}) satisfies MetaTagsProps;

		// We pass the data in a format that is easy for `useQuery` to consume in the
		// corresponding `+page.svelte` file, but you can return the data in any
		// format you like.
		return {
			query,
			params: sanityParams,
			options: { initial },
			pageMetaTags
		};
	} catch (err) {
		// If there's any error loading the post, redirect to main post page
		throw redirect(302, '/blog');
	}
};
