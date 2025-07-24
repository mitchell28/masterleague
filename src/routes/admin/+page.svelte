<script lang="ts">
	import { type PageData } from './$types';
	import {
		Users,
		LineChart,
		Clock,
		RefreshCw,
		PlayCircle,
		FileSearch,
		AlertTriangle,
		Check,
		X,
		Loader2,
		Calendar
	} from '@lucide/svelte';

	// Get data from props
	let { data } = $props<{ data: PageData }>();
	let stats = $derived(data.stats);

	// Define alert state variables
	let showAlert = $state(false);
	let alertType: 'success' | 'error' = $state('success');
	let message = $state('');
	let refreshing = $state(false);

	// Action history - now only for automated tasks
	let actionHistory = $state<
		{
			action: string;
			timestamp: string;
			status: string;
			message?: string;
			runId?: string;
			taskId?: string;
		}[]
	>([]);

	// Track currently running tasks
	let runningTasks = $state<Set<string>>(new Set());

	// Auto-refresh interval
	let refreshInterval: NodeJS.Timeout | null = null;

	// Start auto-refresh when component mounts
	$effect(() => {
		// Auto-refresh stats every 30 seconds if there are running tasks
		// or every 5 minutes otherwise
		const interval = runningTasks.size > 0 ? 30000 : 300000;

		if (refreshInterval) {
			clearInterval(refreshInterval);
		}

		refreshInterval = setInterval(() => {
			refreshStats();
		}, interval);

		// Cleanup on unmount
		return () => {
			if (refreshInterval) {
				clearInterval(refreshInterval);
			}
		};
	});

	// Refresh stats function
	async function refreshStats() {
		refreshing = true;
		try {
			const response = await fetch('/api/admin/stats');
			if (response.ok) {
				const result = await response.json();
				if (result.stats) {
					// Update stats which will automatically update dashboardMetrics
					data = { ...data, stats: result.stats };
				}
			}
		} catch (error) {
			console.error('Failed to refresh stats:', error);
		} finally {
			refreshing = false;
		}
	}
</script>

<div class="container mx-auto mt-26 max-w-6xl px-4 py-8">
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
				disabled={refreshing}
				class="flex items-center rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white shadow hover:bg-slate-600 disabled:opacity-50"
			>
				<RefreshCw class={`mr-1.5 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
				{refreshing ? 'Refreshing...' : 'Refresh Stats'}
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
					<p class="text-2xl font-bold text-white">{stats.totalUsers || 0}</p>
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
					<p class="text-2xl font-bold text-white">{stats.totalPredictions || 0}</p>
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
					<p class="text-2xl font-bold text-white">{stats.currentWeek || 1}</p>
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
					<div class="flex items-center gap-2">
						<p class="text-sm font-bold text-white">
							{new Date(stats.lastUpdated || Date.now()).toLocaleString()}
						</p>
						{#if refreshing}
							<div class="h-2 w-2 animate-pulse rounded-full bg-blue-400"></div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Additional Stats Row -->
	<div class="mb-8 grid gap-6 md:grid-cols-3">
		<div class="rounded-lg border border-slate-700 bg-slate-800/70 p-5 shadow-xl">
			<div class="flex items-center">
				<div class="rounded-md bg-green-900/50 p-3">
					<Check class="h-6 w-6 text-green-400" />
				</div>
				<div class="ml-5">
					<p class="text-sm font-medium text-slate-400">Completed Fixtures</p>
					<p class="text-2xl font-bold text-white">{stats.completedFixtures || 0}</p>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800/70 p-5 shadow-xl">
			<div class="flex items-center">
				<div class="rounded-md bg-purple-900/50 p-3">
					<Calendar class="h-6 w-6 text-purple-400" />
				</div>
				<div class="ml-5">
					<p class="text-sm font-medium text-slate-400">Upcoming Fixtures</p>
					<p class="text-2xl font-bold text-white">{stats.upcomingFixtures || 0}</p>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800/70 p-5 shadow-xl">
			<div class="flex items-center">
				<div class="rounded-md bg-slate-900/50 p-3">
					<FileSearch class="h-6 w-6 text-slate-400" />
				</div>
				<div class="ml-5">
					<p class="text-sm font-medium text-slate-400">Total Fixtures</p>
					<p class="text-2xl font-bold text-white">{stats.totalFixtures || 0}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Automated Tasks Information Section -->
	<div class="mb-8">
		<div class="rounded-lg border border-slate-700 bg-slate-800/70 p-6 shadow-xl">
			<h2 class="mb-5 text-2xl font-bold text-white">Automated Task Schedule</h2>
			<p class="mb-6 text-slate-300">
				All admin tasks now run automatically on optimized schedules. No manual intervention
				required!
			</p>

			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<!-- Schedule Cards -->
				<div class="rounded-lg border border-blue-700 bg-blue-950/30 p-4">
					<div class="mb-3 flex items-center">
						<Calendar class="mr-2 h-6 w-6 text-blue-400" />
						<h3 class="font-semibold text-white">Weekly Multipliers</h3>
					</div>
					<p class="mb-2 text-sm text-slate-300">Updates point multipliers for the current week</p>
					<p class="text-xs text-blue-300">Every Monday at 6:00 AM UTC</p>
				</div>

				<div class="rounded-lg border border-green-700 bg-green-950/30 p-4">
					<div class="mb-3 flex items-center">
						<RefreshCw class="mr-2 h-6 w-6 text-green-400" />
						<h3 class="font-semibold text-white">Fixture Recovery</h3>
					</div>
					<p class="mb-2 text-sm text-slate-300">Fixes missing scores and incorrect statuses</p>
					<p class="text-xs text-green-300">Every 2 hours</p>
				</div>

				<div class="rounded-lg border border-purple-700 bg-purple-950/30 p-4">
					<div class="mb-3 flex items-center">
						<LineChart class="mr-2 h-6 w-6 text-purple-400" />
						<h3 class="font-semibold text-white">Fixture Counts</h3>
					</div>
					<p class="mb-2 text-sm text-slate-300">Updates leaderboard prediction counts</p>
					<p class="text-xs text-purple-300">Daily at 8:00 AM UTC</p>
				</div>

				<div class="rounded-lg border border-amber-700 bg-amber-950/30 p-4">
					<div class="mb-3 flex items-center">
						<Clock class="mr-2 h-6 w-6 text-amber-400" />
						<h3 class="font-semibold text-white">Schedule Checks</h3>
					</div>
					<p class="mb-2 text-sm text-slate-300">Monitors for fixture date changes</p>
					<p class="text-xs text-amber-300">Daily at 9:00 AM UTC</p>
				</div>
			</div>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-1">
		<!-- System Monitoring -->
		<div class="rounded-lg border border-slate-700 bg-slate-800/70 p-6 shadow-xl">
			<h2 class="mb-5 text-2xl font-bold text-white">System Monitoring</h2>

			<div class="space-y-4">
				<!-- System Status -->
				<div class="rounded-lg bg-slate-700/50 p-4">
					<h3 class="mb-3 flex items-center text-lg font-semibold text-slate-300">
						<PlayCircle class="mr-2 h-5 w-5 text-green-400" />
						System Status
					</h3>
					<div class="grid gap-3 md:grid-cols-2">
						<div class="flex items-center">
							<div class="mr-2 h-2 w-2 rounded-full bg-green-400"></div>
							<span class="text-sm text-slate-300">Automated tasks running</span>
						</div>
						<div class="flex items-center">
							<div class="mr-2 h-2 w-2 rounded-full bg-blue-400"></div>
							<span class="text-sm text-slate-300">Data monitoring active</span>
						</div>
						<div class="flex items-center">
							<div class="mr-2 h-2 w-2 rounded-full bg-purple-400"></div>
							<span class="text-sm text-slate-300">Auto-refresh enabled</span>
						</div>
						<div class="flex items-center">
							<div class="mr-2 h-2 w-2 rounded-full bg-amber-400"></div>
							<span class="text-sm text-slate-300">Schedule optimized</span>
						</div>
					</div>
				</div>

				<!-- Next Scheduled Tasks -->
				<div class="rounded-lg bg-slate-700/50 p-4">
					<h3 class="mb-3 flex items-center text-lg font-semibold text-slate-300">
						<Clock class="mr-2 h-5 w-5 text-blue-400" />
						Next Scheduled Tasks
					</h3>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between text-slate-300">
							<span>Fixture Recovery</span>
							<span class="text-green-300">Next: Every 2 hours</span>
						</div>
						<div class="flex justify-between text-slate-300">
							<span>Daily Fixture Counts</span>
							<span class="text-purple-300">Tomorrow 8:00 AM UTC</span>
						</div>
						<div class="flex justify-between text-slate-300">
							<span>Schedule Check</span>
							<span class="text-amber-300">Tomorrow 9:00 AM UTC</span>
						</div>
						<div class="flex justify-between text-slate-300">
							<span>Weekly Multipliers</span>
							<span class="text-blue-300">Next Monday 6:00 AM UTC</span>
						</div>
					</div>
				</div>

				<!-- Manual Override Notice -->
				<div class="rounded-lg border border-amber-700 bg-amber-900/20 p-4">
					<h3 class="mb-2 flex items-center text-sm font-semibold text-amber-300">
						<AlertTriangle class="mr-2 h-4 w-4" />
						Manual Tasks Removed
					</h3>
					<p class="text-xs text-amber-200">
						All maintenance tasks now run automatically. Manual triggers have been removed to
						prevent conflicts and ensure optimal scheduling. If urgent intervention is needed,
						access the trigger.dev dashboard directly.
					</p>
				</div>
			</div>
		</div>

		<!-- Automated Task Activity -->
		<div class="rounded-lg border border-slate-700 bg-slate-800/70 p-6 shadow-xl">
			<h2 class="mb-5 text-2xl font-bold text-white">Automated Task Activity</h2>

			{#if actionHistory.length === 0}
				<div class="flex flex-col items-center justify-center py-8 text-center">
					<PlayCircle class="h-12 w-12 text-slate-600" />
					<p class="mt-3 text-slate-400">No recent automated tasks</p>
					<p class="mt-1 text-xs text-slate-500">Scheduled tasks will appear here when they run</p>
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
										{:else if action.status === 'Running' || action.status === 'Triggering...'}
											<span
												class="flex w-fit items-center rounded-full bg-blue-900/50 px-2 py-1 text-xs font-medium text-blue-300"
											>
												<Loader2 class="mr-1 h-3 w-3 animate-spin" />
												{action.status}
											</span>
										{:else}
											<span
												class="flex w-fit items-center rounded-full bg-amber-900/50 px-2 py-1 text-xs font-medium text-amber-300"
											>
												<Clock class="mr-1 h-3 w-3" />
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
