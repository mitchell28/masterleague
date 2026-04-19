<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		Users,
		Search,
		Shield,
		ShieldOff,
		Ban,
		CircleCheck,
		KeyRound,
		Trash2,
		LogOut,
		UserCog,
		ChevronLeft,
		ChevronRight,
		ArrowLeft,
		Mail,
		MailCheck,
		MailX,
		EyeOff,
		LoaderCircle
	} from '@lucide/svelte';
	import { authClient } from '$lib/client/auth-client';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type ActiveDialog =
		| { type: 'ban'; userId: string; userLabel: string }
		| { type: 'password'; userId: string; userLabel: string }
		| { type: 'remove'; userId: string; userLabel: string }
		| null;

	let activeDialog = $state<ActiveDialog>(null);
	let pendingActionUserId = $state<string | null>(null);
	let pendingActions = $state<Set<string>>(new Set());
	let dialogSubmitting = $state(false);
	let banReason = $state('');
	let banExpiresInDays = $state('');
	let newPassword = $state('');
	let removeConfirmation = $state('');

	let searchValue = $state(untrack(() => data.searchValue));
	let searchField = $state(untrack(() => data.searchField));
	let searchOperator = $state(untrack(() => data.searchOperator));

	let totalPages = $derived(Math.max(1, Math.ceil(data.total / Math.max(1, data.limit))));
	let currentPage = $derived(Math.floor(data.offset / Math.max(1, data.limit)) + 1);

	$effect(() => {
		if (form?.success && form.message) {
			toast.success(form.message);
			closeDialog();
			invalidateAll();
		} else if (form && 'error' in form && form.error) {
			toast.error(form.error);
		}
	});

	function closeDialog() {
		activeDialog = null;
		dialogSubmitting = false;
		banReason = '';
		banExpiresInDays = '';
		newPassword = '';
		removeConfirmation = '';
	}

	function inlineEnhance(userId: string, actionName: string) {
		return () => {
			const key = `${actionName}:${userId}`;
			pendingActions.add(key);
			pendingActions = pendingActions;
			return async ({ update }: { update: (opts?: { reset?: boolean }) => Promise<void> }) => {
				await update({ reset: false });
				pendingActions.delete(key);
				pendingActions = pendingActions;
			};
		};
	}

	function dialogEnhance() {
		dialogSubmitting = true;
		return async ({ update }: { update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			dialogSubmitting = false;
		};
	}

	function isActionPending(userId: string, action: string) {
		return pendingActions.has(`${action}:${userId}`);
	}

	function openBan(userId: string, userLabel: string) {
		activeDialog = { type: 'ban', userId, userLabel };
	}
	function openPassword(userId: string, userLabel: string) {
		activeDialog = { type: 'password', userId, userLabel };
	}
	function openRemove(userId: string, userLabel: string) {
		activeDialog = { type: 'remove', userId, userLabel };
	}

	function buildQuery(overrides: Record<string, string | number | undefined> = {}) {
		const params = new URLSearchParams();
		const merged: Record<string, string | number | undefined> = {
			q: searchValue || undefined,
			field: searchField,
			op: searchOperator,
			limit: data.limit,
			offset: data.offset,
			sortBy: data.sortBy,
			sortDir: data.sortDirection,
			...overrides
		};
		for (const [key, value] of Object.entries(merged)) {
			if (value === undefined || value === null || value === '') continue;
			params.set(key, String(value));
		}
		return `?${params.toString()}`;
	}

	function applySearch(event: SubmitEvent) {
		event.preventDefault();
		goto(buildQuery({ offset: 0 }));
	}

	function clearSearch() {
		searchValue = '';
		goto(buildQuery({ q: undefined, offset: 0 }));
	}

	function gotoPage(targetPage: number) {
		const safe = Math.max(1, Math.min(totalPages, targetPage));
		goto(buildQuery({ offset: (safe - 1) * data.limit }));
	}

	function changePageSize(event: Event) {
		const next = Number((event.target as HTMLSelectElement).value);
		goto(buildQuery({ limit: next, offset: 0 }));
	}

	function changeSort(field: string) {
		const nextDirection =
			data.sortBy === field && data.sortDirection === 'asc' ? 'desc' : 'asc';
		goto(buildQuery({ sortBy: field, sortDir: nextDirection, offset: 0 }));
	}

	async function impersonate(userId: string, label: string) {
		if (pendingActionUserId) return;
		pendingActionUserId = userId;
		try {
			const { error } = await authClient.admin.impersonateUser({ userId });
			if (error) {
				toast.error(error.message ?? 'Failed to impersonate user');
				return;
			}
			toast.success(`Now impersonating ${label}`);
			await goto('/predictions', { invalidateAll: true });
		} catch (err) {
			console.error('Impersonate error', err);
			toast.error('Failed to impersonate user');
		} finally {
			pendingActionUserId = null;
		}
	}

	function formatDate(value: unknown) {
		if (!value) return '—';
		const date = value instanceof Date ? value : new Date(value as string);
		if (Number.isNaN(date.getTime())) return '—';
		return date.toLocaleString();
	}

	function userLabel(user: { name?: string | null; email?: string | null }) {
		return user.name?.trim() || user.email || 'Unknown user';
	}

	function isBanActive(user: { banned?: boolean | null; banExpires?: number | null }) {
		if (!user.banned) return false;
		if (!user.banExpires) return true;
		const expiresMs = user.banExpires < 1e12 ? user.banExpires * 1000 : user.banExpires;
		return expiresMs > Date.now();
	}
</script>

<svelte:head>
	<title>User Management - Admin</title>
</svelte:head>

<div class="mx-auto">
	<div class="relative mb-4 sm:mb-6">
		<div class="font-display w-full overflow-hidden bg-slate-900">
			<div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<a
							href="/admin"
							class="mb-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
						>
							<ArrowLeft size={14} /> Back to Admin
						</a>
						<h1 class="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">User Management</h1>
						<p class="mt-1 text-sm text-slate-300">
							Manage users, roles, bans, sessions and impersonation.
						</p>
					</div>
					<div class="flex items-center gap-2 text-sm text-slate-400">
						<Users size={18} />
						<span>{data.total.toLocaleString()} total</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-6xl px-4 sm:px-6">
		{#if data.loadError}
			<div class="mb-4 border border-red-600/50 bg-red-900/20 p-3 text-sm text-red-200">
				{data.loadError}
			</div>
		{/if}

		<!-- Search -->
		<form
			onsubmit={applySearch}
			class="mb-4 grid grid-cols-1 gap-2 bg-slate-800/50 p-3 sm:grid-cols-[1fr_auto_auto_auto_auto]"
		>
			<div class="relative">
				<Search class="absolute top-2.5 left-2 text-slate-400" size={16} />
				<input
					type="text"
					bind:value={searchValue}
					placeholder="Search users..."
					class="w-full bg-slate-900 py-2 pr-3 pl-8 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-blue-500"
				/>
			</div>
			<select
				bind:value={searchField}
				class="bg-slate-900 px-2 py-2 text-sm text-white ring-1 ring-slate-700"
			>
				<option value="email">Email</option>
				<option value="name">Name</option>
			</select>
			<select
				bind:value={searchOperator}
				class="bg-slate-900 px-2 py-2 text-sm text-white ring-1 ring-slate-700"
			>
				<option value="contains">Contains</option>
				<option value="starts_with">Starts with</option>
				<option value="ends_with">Ends with</option>
			</select>
			<button
				type="submit"
				class="bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
			>
				Search
			</button>
			<button
				type="button"
				onclick={clearSearch}
				class="bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
			>
				Clear
			</button>
		</form>

		<!-- Table -->
		<div class="overflow-x-auto bg-slate-800/50">
			<table class="w-full text-left text-sm text-slate-200">
				<thead class="bg-slate-900/60 text-xs uppercase text-slate-400">
					<tr>
						<th class="px-3 py-3">
							<button
								type="button"
								class="hover:text-white"
								onclick={() => changeSort('name')}
							>
								User
								{#if data.sortBy === 'name'}
									<span class="text-blue-400">{data.sortDirection === 'asc' ? '↑' : '↓'}</span>
								{/if}
							</button>
						</th>
						<th class="px-3 py-3">Role</th>
						<th class="px-3 py-3">Status</th>
						<th class="px-3 py-3">
							<button
								type="button"
								class="hover:text-white"
								onclick={() => changeSort('createdAt')}
							>
								Created
								{#if data.sortBy === 'createdAt'}
									<span class="text-blue-400">{data.sortDirection === 'asc' ? '↑' : '↓'}</span>
								{/if}
							</button>
						</th>
						<th class="px-3 py-3 text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.users as u (u.id)}
						{@const label = userLabel(u)}
						{@const banned = isBanActive(u)}
						{@const isSelf = u.id === data.currentUserId}
						<tr class="border-t border-slate-700/40 hover:bg-slate-800/80">
							<td class="px-3 py-3">
								<div class="flex items-center gap-3">
									{#if u.image}
										<img src={u.image} alt={label} class="h-8 w-8 rounded-full object-cover" />
									{:else}
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white"
										>
											{label.slice(0, 1).toUpperCase()}
										</div>
									{/if}
									<div class="min-w-0">
										<div class="flex items-center gap-1 truncate font-medium text-white">
											{label}
											{#if isSelf}
												<span class="ml-1 bg-blue-600/40 px-1.5 py-0.5 text-[10px] uppercase">
													You
												</span>
											{/if}
										</div>
										<div class="flex items-center gap-1 text-xs text-slate-400">
											{#if u.emailVerified}
												<MailCheck size={12} class="text-emerald-400" />
											{:else}
												<MailX size={12} class="text-amber-400" />
											{/if}
											<span class="truncate">{u.email}</span>
										</div>
										<div class="font-mono text-[10px] text-slate-500 truncate">{u.id}</div>
									</div>
								</div>
							</td>
							<td class="px-3 py-3">
								<span
									class="inline-block px-2 py-1 text-xs font-medium {u.role === 'admin'
										? 'bg-purple-600/30 text-purple-200'
										: 'bg-slate-700/60 text-slate-200'}"
								>
									{u.role || 'user'}
								</span>
							</td>
							<td class="px-3 py-3">
								{#if banned}
									<span
										class="inline-flex items-center gap-1 bg-red-600/30 px-2 py-1 text-xs text-red-200"
									>
										<Ban size={12} /> Banned
									</span>
									{#if u.banReason}
										<div class="mt-1 text-[11px] text-red-300/80">{u.banReason}</div>
									{/if}
								{:else}
									<span
										class="inline-flex items-center gap-1 bg-emerald-600/20 px-2 py-1 text-xs text-emerald-200"
									>
										<CircleCheck size={12} /> Active
									</span>
								{/if}
							</td>
							<td class="px-3 py-3 text-xs text-slate-400">{formatDate(u.createdAt)}</td>
							<td class="px-3 py-3">
								<div class="flex flex-wrap items-center justify-end gap-1">
									<!-- Toggle role -->
									<Tooltip
										text={isSelf
											? 'You cannot change your own role'
											: u.role === 'admin'
												? 'Demote to regular user — removes admin privileges'
												: 'Promote to admin — grants full admin access'}
									>
								<form method="POST" action="?/setRole" use:enhance={inlineEnhance(u.id, 'setRole')} class="inline">
									<input type="hidden" name="userId" value={u.id} />
									<input
										type="hidden"
										name="role"
										value={u.role === 'admin' ? 'user' : 'admin'}
									/>
									<button
										type="submit"
										class="bg-slate-700 p-1.5 text-slate-200 hover:bg-purple-600 hover:text-white disabled:opacity-40"
										disabled={isSelf || isActionPending(u.id, 'setRole')}
									>
										{#if isActionPending(u.id, 'setRole')}
											<LoaderCircle size={14} class="animate-spin" />
										{:else if u.role === 'admin'}
											<UserCog size={14} />
										{:else}
											<Shield size={14} />
										{/if}
									</button>
								</form>
							</Tooltip>

									<!-- Ban / Unban -->
									{#if banned}
										<Tooltip text="Lift the ban — user can sign in again">
											<form method="POST" action="?/unbanUser" use:enhance class="inline">
												<input type="hidden" name="userId" value={u.id} />
												<button
													type="submit"
													class="bg-slate-700 p-1.5 text-emerald-300 hover:bg-emerald-600 hover:text-white"
												>
													<ShieldOff size={14} />
												</button>
											</form>
										</Tooltip>
									{:else}
										<Tooltip
											text={isSelf
												? 'You cannot ban yourself'
												: 'Ban user — blocks sign-in and revokes all sessions'}
										>
											<button
												type="button"
												onclick={() => openBan(u.id, label)}
												class="bg-slate-700 p-1.5 text-amber-300 hover:bg-amber-600 hover:text-white disabled:opacity-40"
												disabled={isSelf}
											>
												<Ban size={14} />
											</button>
										</Tooltip>
									{/if}

									<!-- Set password -->
									<Tooltip text="Set a new password for this user (admin override)">
										<button
											type="button"
											onclick={() => openPassword(u.id, label)}
											class="bg-slate-700 p-1.5 text-blue-300 hover:bg-blue-600 hover:text-white"
										>
											<KeyRound size={14} />
										</button>
									</Tooltip>

									<!-- Revoke sessions -->
									<Tooltip
										text="Revoke all active sessions — signs the user out of every device"
									>
								<form method="POST" action="?/revokeSessions" use:enhance={inlineEnhance(u.id, 'revoke')} class="inline">
									<input type="hidden" name="userId" value={u.id} />
									<button
										type="submit"
										class="bg-slate-700 p-1.5 text-orange-300 hover:bg-orange-600 hover:text-white disabled:opacity-40"
										disabled={isActionPending(u.id, 'revoke')}
									>
										{#if isActionPending(u.id, 'revoke')}
											<LoaderCircle size={14} class="animate-spin" />
										{:else}
											<LogOut size={14} />
										{/if}
									</button>
								</form>
							</Tooltip>

									<!-- Impersonate -->
									<Tooltip
										text={isSelf
											? 'You cannot impersonate yourself'
											: 'Impersonate user — sign in as them for up to 1 hour'}
									>
										<button
											type="button"
											onclick={() => impersonate(u.id, label)}
											disabled={isSelf || pendingActionUserId === u.id}
											class="bg-slate-700 p-1.5 text-cyan-300 hover:bg-cyan-600 hover:text-white disabled:opacity-40"
										>
											<EyeOff size={14} />
										</button>
									</Tooltip>

									<!-- Remove -->
									<Tooltip
										text={isSelf
											? 'You cannot delete your own account here'
											: 'Permanently delete user and all of their data'}
									>
										<button
											type="button"
											onclick={() => openRemove(u.id, label)}
											disabled={isSelf}
											class="bg-slate-700 p-1.5 text-red-300 hover:bg-red-600 hover:text-white disabled:opacity-40"
										>
											<Trash2 size={14} />
										</button>
									</Tooltip>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="5" class="px-3 py-8 text-center text-slate-400">
								No users found.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		<div class="mt-3 mb-8 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
			<div class="flex items-center gap-2 text-slate-300">
				<span>Page</span>
				<strong class="text-white">{currentPage}</strong>
				<span>of {totalPages}</span>
				<span class="text-slate-500">·</span>
				<select
					value={data.limit}
					onchange={changePageSize}
					class="bg-slate-900 px-2 py-1 text-sm text-white ring-1 ring-slate-700"
				>
					{#each [10, 25, 50, 100] as size}
						<option value={size}>{size} / page</option>
					{/each}
				</select>
			</div>
			<div class="flex items-center gap-2">
				<button
					type="button"
					disabled={currentPage <= 1}
					onclick={() => gotoPage(currentPage - 1)}
					class="flex items-center gap-1 bg-slate-700 px-3 py-1.5 text-white hover:bg-slate-600 disabled:opacity-40"
				>
					<ChevronLeft size={14} /> Prev
				</button>
				<button
					type="button"
					disabled={currentPage >= totalPages}
					onclick={() => gotoPage(currentPage + 1)}
					class="flex items-center gap-1 bg-slate-700 px-3 py-1.5 text-white hover:bg-slate-600 disabled:opacity-40"
				>
					Next <ChevronRight size={14} />
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Modal -->
{#if activeDialog}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-md bg-slate-900 p-5 ring-1 ring-slate-700">
			{#if activeDialog.type === 'ban'}
				<h3 class="mb-2 text-lg font-bold text-white">Ban {activeDialog.userLabel}</h3>
				<p class="mb-4 text-sm text-slate-400">
					This will block the user from signing in and revoke all of their existing sessions.
				</p>
				<form
					method="POST"
					action="?/banUser"
					use:enhance={() => dialogEnhance()}
					class="space-y-3"
				>
					<input type="hidden" name="userId" value={activeDialog.userId} />
					<div>
						<label class="mb-1 block text-xs uppercase text-slate-400" for="banReason">
							Reason (optional)
						</label>
						<input
							id="banReason"
							name="banReason"
							bind:value={banReason}
							placeholder="e.g. Spamming"
							class="w-full bg-slate-800 px-3 py-2 text-sm text-white ring-1 ring-slate-700 focus:ring-amber-500 outline-none"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs uppercase text-slate-400" for="banExpiresInDays">
							Duration in days (blank = permanent)
						</label>
						<input
							id="banExpiresInDays"
							type="number"
							min="1"
							bind:value={banExpiresInDays}
							class="w-full bg-slate-800 px-3 py-2 text-sm text-white ring-1 ring-slate-700 focus:ring-amber-500 outline-none"
						/>
						<input
							type="hidden"
							name="banExpiresIn"
							value={banExpiresInDays ? Number(banExpiresInDays) * 86400 : ''}
						/>
					</div>
					<div class="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onclick={closeDialog}
							class="bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={dialogSubmitting}
							class="inline-flex items-center gap-2 bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
						>
							{#if dialogSubmitting}
								<LoaderCircle size={14} class="animate-spin" /> Banning…
							{:else}
								Ban User
							{/if}
						</button>
					</div>
				</form>
			{:else if activeDialog.type === 'password'}
				<h3 class="mb-2 text-lg font-bold text-white">Set new password</h3>
				<p class="mb-4 text-sm text-slate-400">
					Set a new password for <strong class="text-white">{activeDialog.userLabel}</strong>.
				</p>
				<form
					method="POST"
					action="?/setPassword"
					use:enhance={() => dialogEnhance()}
					class="space-y-3"
				>
					<input type="hidden" name="userId" value={activeDialog.userId} />
					<div>
						<label class="mb-1 block text-xs uppercase text-slate-400" for="newPassword">
							New password (min 8 chars)
						</label>
						<input
							id="newPassword"
							name="newPassword"
							type="text"
							required
							minlength="8"
							bind:value={newPassword}
							class="w-full bg-slate-800 px-3 py-2 text-sm text-white ring-1 ring-slate-700 focus:ring-blue-500 outline-none"
						/>
					</div>
					<div class="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onclick={closeDialog}
							class="bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={dialogSubmitting}
							class="inline-flex items-center gap-2 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
						>
							{#if dialogSubmitting}
								<LoaderCircle size={14} class="animate-spin" /> Updating…
							{:else}
								Update Password
							{/if}
						</button>
					</div>
				</form>
			{:else if activeDialog.type === 'remove'}
				<h3 class="mb-2 text-lg font-bold text-white">Delete user?</h3>
				<p class="mb-3 text-sm text-slate-400">
					This will permanently delete <strong class="text-white">{activeDialog.userLabel}</strong>
					and all their data. This action cannot be undone.
				</p>
				<p class="mb-3 text-xs text-slate-400">
					Type <strong class="font-mono text-red-300">DELETE</strong> to confirm.
				</p>
				<form
					method="POST"
					action="?/removeUser"
					use:enhance={() => dialogEnhance()}
					class="space-y-3"
				>
					<input type="hidden" name="userId" value={activeDialog.userId} />
					<input
						type="text"
						bind:value={removeConfirmation}
						placeholder="DELETE"
						class="w-full bg-slate-800 px-3 py-2 text-sm text-white ring-1 ring-slate-700 focus:ring-red-500 outline-none"
					/>
					<div class="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onclick={closeDialog}
							class="bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={removeConfirmation !== 'DELETE' || dialogSubmitting}
							class="inline-flex items-center gap-2 bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
						>
							{#if dialogSubmitting}
								<LoaderCircle size={14} class="animate-spin" /> Deleting…
							{:else}
								Permanently Delete
							{/if}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
