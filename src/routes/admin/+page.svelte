<script lang="ts">
	import { type PageData } from './$types';
	import { onMount } from 'svelte';
	import {
		Users,
		LineChart,
		Calendar,
		Clock,
		RefreshCw,
		Calculator,
		PlayCircle,
		Star,
		FileSearch,
		AlertTriangle,
		Check,
		X,
		Loader2,
		Award
	} from '@lucide/svelte';

	// Get data from props
	let { data } = $props<{ data: PageData }>();
	let stats = $derived(data.stats);

	// Define alert state variables
	let showAlert = $state(false);
	let alertType: 'success' | 'error' = $state('success');
	let message = $state('');
	let loading = $state(false);

	// Dashboard metrics
	let dashboardMetrics = $derived({
		userCount: stats.totalUsers || 0,
		predictionCount: stats.totalPredictions || 0,
		currentWeek: stats.currentWeek || 1,
		lastUpdate: new Date().toLocaleString()
	});

	// Action history
	let actionHistory = $state<
		{ action: string; timestamp: string; status: string; message?: string }[]
	>([]);

	// Handle form submission
	async function handleAction(action: string) {
		loading = true;
		const formData = new FormData();
		formData.append('action', action);

		try {
			// Record action in history
			actionHistory = [
				{
					action: action.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
					timestamp: new Date().toLocaleString(),
					status: 'In Progress'
				},
				...actionHistory
			];

			// Make the form submission
			const response = await fetch(`?/${action}`, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();
			loading = false;

			if (result.success) {
				alertType = 'success';
				message = result.message;
				// Update the last action in history
				actionHistory[0].status = 'Success';
				actionHistory[0].message = result.message;
			} else {
				alertType = 'error';
				message = result.message || 'Operation failed';
				// Update the last action in history
				actionHistory[0].status = 'Failed';
				actionHistory[0].message = result.message;
			}

			showAlert = true;

			// Auto-hide alert after 5 seconds
			setTimeout(() => {
				showAlert = false;
			}, 5000);

			// Refresh dashboard stats
			refreshStats();
		} catch (error) {
			loading = false;
			alertType = 'error';
			message = 'An unexpected error occurred';
			showAlert = true;
			// Update the last action in history
			actionHistory[0].status = 'Error';
			actionHistory[0].message = 'Unexpected error';
		}
	}

	// Refresh stats function
	async function refreshStats() {
		try {
			const response = await fetch('/admin', { method: 'GET' });
			if (response.ok) {
				const refreshedData = await response.json();
				if (refreshedData.stats) {
					// Update stats which will automatically update dashboardMetrics
					data = { ...data, stats: refreshedData.stats };
				}
			}
		} catch (error) {
			console.error('Failed to refresh stats:', error);
		}
	}

	onMount(() => {
		// Initial setup
		dashboardMetrics.lastUpdate = new Date().toLocaleString();
	});
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<header class="mb-8">
		<div class="flex flex-wrap items-center justify-between">
			<div>
				<h1
					class="mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-4xl font-bold text-transparent"
				>
					Admin Dashboard
				</h1>
				<p class="text-slate-400">Manage your Premier League prediction system</p>
			</div>

			<button
				onclick={refreshStats}
				class="flex items-center rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white shadow hover:bg-slate-600"
			>
				<RefreshCw class="mr-1.5 h-4 w-4" />
				Refresh Stats
			</button>
		</div>
	</header>

	{#if showAlert}
		<div
			class={`relative mb-6 rounded-lg border p-4 ${alertType === 'success' ? 'border-green-700 bg-green-950/50 text-green-300' : 'border-red-700 bg-red-950/50 text-red-300'}`}
			role="alert"
		>
			<div class="flex items-center gap-3">
				{#if alertType === 'success'}
					<Check class="h-5 w-5 text-green-400" />
				{:else}
					<AlertTriangle class="h-5 w-5 text-red-400" />
				{/if}
				<span class="font-medium">{message}</span>
			</div>
			<button
				class="absolute top-4 right-4 text-slate-400 hover:text-white"
				onclick={() => (showAlert = false)}
				aria-label="Close alert"
			>
				&times;
			</button>
		</div>
	{/if}

	<!-- Dashboard Grid -->
	<div class="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
		<!-- Stats Cards -->
		<div class="rounded-lg border border-slate-700 bg-slate-800/70 p-5 shadow-xl">
			<div class="flex items-center">
				<div class="rounded-md bg-indigo-900/50 p-3">
					<Users class="h-6 w-6 text-indigo-400" />
				</div>
				<div class="ml-5">
					<p class="text-sm font-medium text-slate-400">Total Users</p>
					<p class="text-2xl font-bold text-white">{dashboardMetrics.userCount}</p>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800/70 p-5 shadow-xl">
			<div class="flex items-center">
				<div class="rounded-md bg-green-900/50 p-3">
					<LineChart class="h-6 w-6 text-green-400" />
				</div>
				<div class="ml-5">
					<p class="text-sm font-medium text-slate-400">Total Predictions</p>
					<p class="text-2xl font-bold text-white">{dashboardMetrics.predictionCount}</p>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800/70 p-5 shadow-xl">
			<div class="flex items-center">
				<div class="rounded-md bg-amber-900/50 p-3">
					<Calendar class="h-6 w-6 text-amber-400" />
				</div>
				<div class="ml-5">
					<p class="text-sm font-medium text-slate-400">Current Week</p>
					<p class="text-2xl font-bold text-white">{dashboardMetrics.currentWeek}</p>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800/70 p-5 shadow-xl">
			<div class="flex items-center">
				<div class="rounded-md bg-blue-900/50 p-3">
					<Clock class="h-6 w-6 text-blue-400" />
				</div>
				<div class="ml-5">
					<p class="text-sm font-medium text-slate-400">Last Updated</p>
					<p class="text-sm font-bold text-white">{dashboardMetrics.lastUpdate}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Featured Actions Section -->
	<div class="mb-8 grid gap-6 md:grid-cols-2">
		<!-- Calculate All Points Card -->
		<div class="rounded-lg border border-purple-700 bg-purple-950/30 p-6 shadow-xl">
			<div class="flex flex-col">
				<div class="mb-4">
					<div class="flex items-center">
						<div class="mr-3 rounded-md bg-purple-900/50 p-3">
							<Calculator class="h-8 w-8 text-purple-400" />
						</div>
						<h2 class="text-2xl font-bold text-white">Calculate All Points</h2>
					</div>
					<p class="mt-2 text-slate-300">
						Recalculates all prediction points based on match results. Use this after fixing data
						issues or if the leaderboard seems incorrect. This operation may take several minutes.
					</p>
				</div>

				<button
					disabled={loading}
					onclick={() => handleAction('recalculateAllPoints')}
					class="mt-2 flex items-center justify-center rounded-md bg-purple-600 px-6 py-3 text-base font-medium text-white shadow-lg hover:bg-purple-700 disabled:opacity-50"
				>
					{#if loading && actionHistory[0]?.action.includes('Calculate')}
						<Loader2 class="mr-2 h-5 w-5 animate-spin" />
						Processing...
					{:else}
						<Award class="mr-2 h-5 w-5" />
						Calculate Now
					{/if}
				</button>
			</div>
		</div>

		<!-- Fix Missing Scores Card -->
		<div class="rounded-lg border border-orange-700 bg-orange-950/30 p-6 shadow-xl">
			<div class="flex flex-col">
				<div class="mb-4">
					<div class="flex items-center">
						<div class="mr-3 rounded-md bg-orange-900/50 p-3">
							<AlertTriangle class="h-8 w-8 text-orange-400" />
						</div>
						<h2 class="text-2xl font-bold text-white">Fix Missing Scores</h2>
					</div>
					<p class="mt-2 text-slate-300">
						Checks for and fixes fixtures with missing scores or incorrect statuses. This helps
						ensure all prediction points are calculated correctly for the leaderboard.
					</p>
				</div>

				<button
					disabled={loading}
					onclick={() => handleAction('recoverFixtures')}
					class="mt-2 flex items-center justify-center rounded-md bg-orange-600 px-6 py-3 text-base font-medium text-white shadow-lg hover:bg-orange-700 disabled:opacity-50"
				>
					{#if loading && actionHistory[0]?.action.includes('Recover')}
						<Loader2 class="mr-2 h-5 w-5 animate-spin" />
						Processing...
					{:else}
						<RefreshCw class="mr-2 h-5 w-5" />
						Run Score Check
					{/if}
				</button>
			</div>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<!-- Admin Actions Panel - Now with categories -->
		<div class="rounded-lg border border-slate-700 bg-slate-800/70 p-6 shadow-xl">
			<h2 class="mb-5 text-2xl font-bold text-white">Admin Actions</h2>

			<div class="space-y-6">
				<!-- Data Maintenance Category -->
				<div>
					<h3 class="mb-3 flex items-center text-lg font-semibold text-slate-300">
						<FileSearch class="mr-2 h-5 w-5 text-slate-400" />
						Data Maintenance
					</h3>
					<div class="space-y-3">
						<div>
							<button
								disabled={loading}
								onclick={() => handleAction('updateFixtureCounts')}
								class="flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow hover:bg-indigo-700 disabled:opacity-50"
							>
								{#if loading && actionHistory[0]?.action.includes('Fixture Counts')}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Update Fixture Counts
							</button>
							<p class="mt-1 text-xs text-slate-400">
								Updates predicted and completed fixture counts for all users
							</p>
						</div>

						<div>
							<button
								disabled={loading}
								onclick={() => handleAction('recoverFixtures')}
								class="flex w-full items-center justify-center rounded-md bg-orange-600 px-4 py-3 text-sm font-medium text-white shadow hover:bg-orange-700 disabled:opacity-50"
							>
								{#if loading && actionHistory[0]?.action.includes('Recover')}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{:else}
									<AlertTriangle class="mr-2 h-4 w-4" />
								{/if}
								Fix Missing Scores
							</button>
							<p class="mt-1 text-xs text-slate-400">
								Find and fix fixtures with missing scores or incorrect statuses
							</p>
						</div>
					</div>
				</div>

				<!-- Points Multipliers Category -->
				<div>
					<h3 class="mb-3 flex items-center text-lg font-semibold text-slate-300">
						<Star class="mr-2 h-5 w-5 text-yellow-400" />
						Points Multipliers
					</h3>
					<div class="space-y-3">
						<div>
							<button
								disabled={loading}
								onclick={() => handleAction('updateMultipliers')}
								class="flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow hover:bg-indigo-700 disabled:opacity-50"
							>
								{#if loading && actionHistory[0]?.action.includes('Current Week Multipliers')}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Update Current Week Multipliers
							</button>
							<p class="mt-1 text-xs text-slate-400">
								Update point multipliers for current week's fixtures
							</p>
						</div>

						<div>
							<button
								disabled={loading}
								onclick={() => handleAction('updateAllMultipliers')}
								class="flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow hover:bg-indigo-700 disabled:opacity-50"
							>
								{#if loading && actionHistory[0]?.action.includes('All Multipliers')}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Update All Multipliers
							</button>
							<p class="mt-1 text-xs text-slate-400">Update point multipliers for all fixtures</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Recent Activity Log -->
		<div class="rounded-lg border border-slate-700 bg-slate-800/70 p-6 shadow-xl">
			<h2 class="mb-5 text-2xl font-bold text-white">Recent Activity</h2>

			{#if actionHistory.length === 0}
				<div class="flex flex-col items-center justify-center py-8 text-center">
					<PlayCircle class="h-12 w-12 text-slate-600" />
					<p class="mt-3 text-slate-400">No recent actions</p>
					<p class="mt-1 text-xs text-slate-500">Actions you perform will appear here</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
									>Action</th
								>
								<th
									class="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
									>Time</th
								>
								<th
									class="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
									>Status</th
								>
							</tr>
						</thead>
						<tbody>
							{#each actionHistory as action, i}
								<tr class={i % 2 === 0 ? 'bg-slate-800/30' : ''}>
									<td class="px-4 py-2 text-sm font-medium whitespace-nowrap text-white"
										>{action.action}</td
									>
									<td class="px-4 py-2 text-sm whitespace-nowrap text-slate-300"
										>{action.timestamp}</td
									>
									<td class="px-4 py-2 text-sm whitespace-nowrap">
										{#if action.status === 'Success'}
											<span
												class="flex w-fit items-center rounded-full bg-green-900/50 px-2 py-1 text-xs font-medium text-green-300"
											>
												<Check class="mr-1 h-3 w-3" />
												{action.status}
											</span>
										{:else if action.status === 'Failed' || action.status === 'Error'}
											<span
												class="flex w-fit items-center rounded-full bg-red-900/50 px-2 py-1 text-xs font-medium text-red-300"
											>
												<X class="mr-1 h-3 w-3" />
												{action.status}
											</span>
										{:else}
											<span
												class="flex w-fit items-center rounded-full bg-amber-900/50 px-2 py-1 text-xs font-medium text-amber-300"
											>
												<Loader2 class="mr-1 h-3 w-3 animate-spin" />
												{action.status}
											</span>
										{/if}
									</td>
								</tr>
								{#if action.message && (action.status === 'Failed' || action.status === 'Error')}
									<tr class={i % 2 === 0 ? 'bg-slate-800/30' : ''}>
										<td colspan="3" class="px-4 py-2 text-xs text-red-300 italic">
											{action.message}
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>
