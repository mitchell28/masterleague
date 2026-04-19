import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';
import auth from '$lib/server/db/auth/auth';
import { APIError } from 'better-auth/api';
import { db } from '$lib/server/db/index';
import { predictions, leagueTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_PAGE_SIZE = 25;

type SearchField = 'email' | 'name';
type SearchOperator = 'contains' | 'starts_with' | 'ends_with';
type SortDirection = 'asc' | 'desc';

function parseInteger(value: string | null, fallback: number, min = 0): number {
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed) || parsed < min) return fallback;
	return parsed;
}

export const load: PageServerLoad = async ({ locals, url, request }) => {
	if (locals.user?.role !== 'admin') {
		throw redirect(302, '/predictions');
	}

	const limit = Math.min(parseInteger(url.searchParams.get('limit'), DEFAULT_PAGE_SIZE, 1), 100);
	const offset = parseInteger(url.searchParams.get('offset'), 0, 0);
	const searchValue = url.searchParams.get('q')?.trim() || undefined;
	const searchField = (url.searchParams.get('field') as SearchField) || 'email';
	const searchOperator = (url.searchParams.get('op') as SearchOperator) || 'contains';
	const sortBy = url.searchParams.get('sortBy') || 'createdAt';
	const sortDirection = (url.searchParams.get('sortDir') as SortDirection) || 'desc';
	const filterField = url.searchParams.get('filterField') || undefined;
	const filterValue = url.searchParams.get('filterValue') || undefined;

	const query: Record<string, unknown> = {
		limit,
		offset,
		sortBy,
		sortDirection
	};

	if (searchValue) {
		query.searchValue = searchValue;
		query.searchField = searchField;
		query.searchOperator = searchOperator;
	}

	if (filterField && filterValue) {
		query.filterField = filterField;
		query.filterValue = filterValue;
	}

	let users: any[] = [];
	let total = 0;
	let loadError: string | null = null;

	try {
		const result = await auth.api.listUsers({
			query: query as any,
			headers: request.headers
		});
		users = result?.users ?? [];
		total = result?.total ?? 0;
	} catch (error) {
		console.error('[Admin Users] Failed to list users:', error);
		loadError = error instanceof Error ? error.message : 'Failed to load users';
	}

	const pageMetaTags: MetaTagsProps = Object.freeze({
		title: 'User Management',
		description: 'Manage users, roles, bans, and sessions.',
		canonical: new URL(url.pathname, url.origin).href,
		robots: 'noindex,nofollow'
	});

	return {
		users,
		total,
		limit,
		offset,
		searchValue: searchValue ?? '',
		searchField,
		searchOperator,
		sortBy,
		sortDirection,
		loadError,
		currentUserId: locals.user.id,
		pageMetaTags
	};
};

function jsonError(error: unknown, fallback: string) {
	if (error instanceof APIError) {
		return error.body?.message || error.message || fallback;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return fallback;
}

async function requireAdmin(locals: App.Locals) {
	if (locals.user?.role !== 'admin') {
		throw redirect(302, '/predictions');
	}
}

export const actions: Actions = {
	setRole: async ({ request, locals }) => {
		await requireAdmin(locals);
		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		const role = String(data.get('role') ?? '');

		if (!userId || !role) {
			return fail(400, { action: 'setRole', error: 'User ID and role are required' });
		}

		try {
			await auth.api.setRole({
				body: { userId, role: role as 'admin' | 'user' },
				headers: request.headers
			});
			return { action: 'setRole', success: true, message: `Role updated to "${role}"` };
		} catch (error) {
			return fail(400, {
				action: 'setRole',
				error: jsonError(error, 'Failed to update role')
			});
		}
	},

	banUser: async ({ request, locals }) => {
		await requireAdmin(locals);
		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		const banReason = String(data.get('banReason') ?? '').trim();
		const banExpiresInRaw = String(data.get('banExpiresIn') ?? '').trim();

		if (!userId) {
			return fail(400, { action: 'banUser', error: 'User ID is required' });
		}
		if (userId === locals.user!.id) {
			return fail(400, { action: 'banUser', error: 'You cannot ban yourself' });
		}

		const body: Record<string, unknown> = { userId };
		if (banReason) body.banReason = banReason;
		if (banExpiresInRaw) {
			const banExpiresIn = Number.parseInt(banExpiresInRaw, 10);
			if (!Number.isNaN(banExpiresIn) && banExpiresIn > 0) {
				body.banExpiresIn = banExpiresIn;
			}
		}

		try {
			await auth.api.banUser({ body: body as any, headers: request.headers });
			return { action: 'banUser', success: true, message: 'User banned' };
		} catch (error) {
			return fail(400, {
				action: 'banUser',
				error: jsonError(error, 'Failed to ban user')
			});
		}
	},

	unbanUser: async ({ request, locals }) => {
		await requireAdmin(locals);
		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');

		if (!userId) {
			return fail(400, { action: 'unbanUser', error: 'User ID is required' });
		}

		try {
			await auth.api.unbanUser({ body: { userId }, headers: request.headers });
			return { action: 'unbanUser', success: true, message: 'User unbanned' };
		} catch (error) {
			return fail(400, {
				action: 'unbanUser',
				error: jsonError(error, 'Failed to unban user')
			});
		}
	},

	revokeSessions: async ({ request, locals }) => {
		await requireAdmin(locals);
		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');

		if (!userId) {
			return fail(400, { action: 'revokeSessions', error: 'User ID is required' });
		}

		try {
			await auth.api.revokeUserSessions({ body: { userId }, headers: request.headers });
			return { action: 'revokeSessions', success: true, message: 'All sessions revoked' };
		} catch (error) {
			return fail(400, {
				action: 'revokeSessions',
				error: jsonError(error, 'Failed to revoke sessions')
			});
		}
	},

	setPassword: async ({ request, locals }) => {
		await requireAdmin(locals);
		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		const newPassword = String(data.get('newPassword') ?? '');

		if (!userId || !newPassword) {
			return fail(400, {
				action: 'setPassword',
				error: 'User ID and new password are required'
			});
		}
		if (newPassword.length < 8) {
			return fail(400, {
				action: 'setPassword',
				error: 'Password must be at least 8 characters'
			});
		}

		try {
			await auth.api.setUserPassword({
				body: { userId, newPassword },
				headers: request.headers
			});
			return { action: 'setPassword', success: true, message: 'Password updated' };
		} catch (error) {
			return fail(400, {
				action: 'setPassword',
				error: jsonError(error, 'Failed to update password')
			});
		}
	},

	removeUser: async ({ request, locals }) => {
		await requireAdmin(locals);
		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');

		if (!userId) {
			return fail(400, { action: 'removeUser', error: 'User ID is required' });
		}
		if (userId === locals.user!.id) {
			return fail(400, { action: 'removeUser', error: 'You cannot delete your own account here' });
		}

		try {
			// Delete app data that references this user before removing the user
			await db.delete(predictions).where(eq(predictions.userId, userId));
			await db.delete(leagueTable).where(eq(leagueTable.userId, userId));

			await auth.api.removeUser({ body: { userId }, headers: request.headers });
			return { action: 'removeUser', success: true, message: 'User removed' };
		} catch (error) {
			return fail(400, {
				action: 'removeUser',
				error: jsonError(error, 'Failed to remove user')
			});
		}
	}
};
