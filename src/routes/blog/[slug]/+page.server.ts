import { postQuery as query, type Post } from '$lib/sanity/lib/queries';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { loadQuery } = event.locals;
	const { slug } = event.params;

	const params = { slug };

	try {
		const initial = await loadQuery<Post>(query, params);

		// If no post found from Sanity, redirect to main post page
		if (!initial.data) {
			throw redirect(302, '/blog');
		}

		// We pass the data in a format that is easy for `useQuery` to consume in the
		// corresponding `+page.svelte` file, but you can return the data in any
		// format you like.
		return {
			query,
			params,
			options: { initial }
		};
	} catch (err) {
		// If there's any error loading the post, redirect to main post page
		throw redirect(302, '/blog');
	}
};
