import { redirect } from '@sveltejs/kit';
import type { MetaTagsProps } from 'svelte-meta-tags';

export const load = async ({ locals, url }) => {
	try {
		if (locals.user?.role !== 'admin') {
			throw redirect(302, '/predictions');
		}

		const pageMetaTags: MetaTagsProps = Object.freeze({
			title: 'Admin Panel',
			description: 'Admin panel for managing users and system settings.',
			canonical: new URL(url.pathname, url.origin).href,
			openGraph: {
				title: 'Admin Panel - Master League',
				description: 'Admin panel for managing users and system settings.',
				url: new URL(url.pathname, url.origin).href
			},
			twitter: {
				title: 'Admin Panel - Master League',
				description: 'Admin panel for managing users and system settings.'
			}
		});

		return {
			pageMetaTags
		};
	} catch (error) {
		console.error('Failed to load admin page:', error);
		return {};
	}
};
