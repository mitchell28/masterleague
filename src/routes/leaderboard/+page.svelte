<script lang="ts">
	import { type PageData } from './$types';
	import { goto } from '$app/navigation';
	import { ChevronUp, RefreshCcw, SearchIcon } from '@lucide/svelte';
	import { useAutoRefresh } from '$lib/hooks';
	import { useLeaderboardMetrics } from './hooks';

	// Props and state
	let { data } = $props<{ data: PageData }>();
	$inspect(data);

	// Update leaderboard when data changes (reactive to server load updates)
	let leaderboard = $derived(data.leaderboard || []);

	// Use custom hooks
	const autoRefresh = useAutoRefresh({
		invalidateKey: '/leaderboard',
		interval: 60000
	});

	const metrics = useLeaderboardMetrics();

	// Local reactive state for search and sorting
	let searchQuery = $state('');
	let sortKey = $state<string>('totalPoints');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	// Filtered and sorted data
	let filteredData = $derived(() => {
		if (!leaderboard) return [];

		if (!searchQuery.trim()) return leaderboard;

		const query = searchQuery.toLowerCase().trim();
		return leaderboard.filter((entry: any) => {
			const username = (entry.username || '').toLowerCase();
			return username.includes(query);
		});
	});

	let sortedData = $derived(() => {
		const data = filteredData();
		if (!data) return [];

		return [...data].sort((a: any, b: any) => {
			// Special case for totalPoints - include tiebreakers
			if (sortKey === 'totalPoints') {
				if (a.totalPoints !== b.totalPoints) {
					return sortDirection === 'desc'
						? b.totalPoints - a.totalPoints
						: a.totalPoints - b.totalPoints;
				}
				// First tiebreaker: correct scorelines
				if (a.correctScorelines !== b.correctScorelines) {
					return sortDirection === 'desc'
						? b.correctScorelines - a.correctScorelines
						: a.correctScorelines - b.correctScorelines;
				}
				// Second tiebreaker: correct outcomes
				return sortDirection === 'desc'
					? b.correctOutcomes - a.correctOutcomes
					: a.correctOutcomes - b.correctOutcomes;
			}

			// For other columns, do standard sorting
			const valueA = a[sortKey];
			const valueB = b[sortKey];

			// Handle string values
			if (typeof valueA === 'string' && typeof valueB === 'string') {
				return sortDirection === 'desc'
					? valueB.localeCompare(valueA)
					: valueA.localeCompare(valueB);
			}

			// Handle numeric values
			return sortDirection === 'desc'
				? Number(valueB) - Number(valueA)
				: Number(valueA) - Number(valueB);
		});
	});

	// Handle column sort clicks
	function toggleSort(key: string) {
		if (sortKey === key) {
			sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
		} else {
			sortKey = key;
			sortDirection = 'desc';
		}
	}

	// View user's predictions
	function viewUserPredictions(userId: string) {
		goto(`/leaderboard/user/${userId}/${data.currentWeek}`);
	}
</script>

<div class="mx-auto mt-22">
	<!-- Main Header with clean geometric design -->
	<div class="relative">
		<div class="font-display mb-6 w-full overflow-hidden bg-slate-900">
			<div class="mx-auto my-6 max-w-6xl">
				<!-- Main content area -->
				<div class="relative flex h-full items-center justify-between px-4 py-4">
					<div>
						<h1 class="text-3xl font-bold text-white">Overall Standings</h1>
						<div class="mt-2 flex items-center gap-3">
							<span class="text-sm font-medium text-slate-300">
								{#if data.selectedOrganization}
									Organization: {data.selectedOrganization.name}
								{:else}
									Global Competition
								{/if}
							</span>
						</div>
					</div>
					<div class="flex items-center gap-4 text-base text-slate-400">
						<div>Week <span class="font-semibold text-white">{data.currentWeek}</span></div>
						<div>
							Total Players <span class="font-semibold text-white">{leaderboard.length}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-6xl">
		<!-- Controls and filters (clean layout) -->
		<div class="mb-8 flex flex-wrap items-center justify-between gap-4 bg-slate-800/50 px-6 py-4">
			<div class="flex items-center gap-3">
				<!-- Search input -->
				<div class="relative">
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search players..."
						class="w-64 bg-slate-700/80 px-3 py-2 text-sm text-white placeholder-slate-400 transition outline-none focus:bg-slate-700"
					/>
					<SearchIcon class="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400" size={16} />
				</div>
			</div>

			<div class="flex items-center gap-4">
				<!-- Last refresh timestamp -->
				<span class="text-base text-slate-400">
					Last updated: {autoRefresh.lastRefreshTime}
					{#if autoRefresh.isAutoRefreshEnabled}
						<span class="ml-1 text-green-400">• Auto</span>
					{/if}
				</span>

				<!-- Auto refresh toggle -->
				<div class="flex items-center">
					<label class="relative inline-flex cursor-pointer items-center">
						<input
							type="checkbox"
							class="peer sr-only"
							checked={autoRefresh.isAutoRefreshEnabled}
							onchange={autoRefresh.toggleAutoRefresh}
						/>
						<div
							class="peer h-5 w-9 bg-slate-700 peer-checked:bg-indigo-600 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"
						></div>
						<span class="ml-2 text-base font-medium text-slate-300">Auto refresh</span>
					</label>
				</div>

				<!-- Refresh button -->
				<button
					class="bg-accent hover:bg-accent/80 font-display relative inline-flex items-center px-4 py-2 text-base font-semibold tracking-wide text-black transition disabled:cursor-not-allowed disabled:opacity-50"
					onclick={autoRefresh.refresh}
					disabled={autoRefresh.isRefreshing}
				>
					<RefreshCcw size={16} class={`mr-2 ${autoRefresh.isRefreshing ? 'animate-spin' : ''}`} />
					{autoRefresh.isRefreshing ? 'Refreshing...' : 'Refresh'}
				</button>
			</div>
		</div>

		<!-- Leaderboard table clean card -->
		<div class=" overflow-hidden bg-slate-800/50">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-700/70">
					<thead class="bg-slate-900/50">
						<tr>
							<th
								class="cursor-pointer px-4 py-3 text-left text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase hover:text-white"
							>
								<div class="flex items-center">
									<span>Player</span>
								</div>
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase hover:text-white"
								onclick={() => toggleSort('totalPoints')}
							>
								<div class="flex items-center justify-center">
									<span>Points</span>
									<ChevronUp
										size={16}
										class={`ml-1 text-slate-400 ${sortKey === 'totalPoints' ? (sortDirection === 'asc' ? 'rotate-180' : '') : ''}`}
									/>
								</div>
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase hover:text-white"
							>
								<div class="flex items-center justify-center">
									<span>Perfect</span>
								</div>
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase hover:text-white"
							>
								<div class="flex items-center justify-center">
									<span>Outcome</span>
								</div>
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase hover:text-white"
							>
								<div class="flex items-center justify-center">
									<span>Predictions</span>
								</div>
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase hover:text-white"
							>
								<div class="flex items-center justify-center">
									<span>Completed</span>
								</div>
							</th>
							<th
								class="px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase"
							>
								Success Rate
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-700/60">
						{#if sortedData() && sortedData().length > 0}
							{#each sortedData() as entry, index}
								<tr
									class="cursor-pointer transition-colors hover:bg-slate-700/30"
									onclick={() => viewUserPredictions(entry.id)}
								>
									<!-- Player name and rank -->
									<td class="px-4 py-3 whitespace-nowrap">
										<div class="flex items-center">
											<div
												class="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-700/80 text-sm font-bold text-slate-300"
											>
												{index + 1}
											</div>
											<div>
												<div class="font-medium tracking-wide text-white">
													{entry?.username || 'Anonymous'}
												</div>
											</div>
										</div>
									</td>
									<!-- Total points -->
									<td class="px-4 py-3 text-center font-bold whitespace-nowrap text-indigo-300">
										{entry.totalPoints || 0}
									</td>
									<!-- Perfect score predictions -->
									<td class="px-4 py-3 text-center font-medium whitespace-nowrap text-green-400">
										{entry.correctScorelines || 0}
									</td>
									<!-- Correct outcome predictions -->
									<td class="px-4 py-3 text-center font-medium whitespace-nowrap text-blue-400">
										{entry.correctOutcomes || 0}
									</td>
									<!-- Total predictions -->
									<td class="px-4 py-3 text-center font-medium whitespace-nowrap text-purple-300">
										{entry.predictedFixtures || 0}
									</td>
									<!-- Completed fixtures -->
									<td class="px-4 py-3 text-center font-medium whitespace-nowrap text-slate-400">
										{entry.completedFixtures || 0}
									</td>
									<!-- Success rate -->
									<td class="px-4 py-3 text-center whitespace-nowrap">
										{#if (entry.predictedFixtures || 0) > 0}
											<div class="flex items-center justify-center">
												<div class="h-2 w-16 overflow-hidden rounded-full bg-slate-700/80">
													<div
														class="h-full bg-yellow-500/80"
														style={`width: ${metrics.calculateSuccessRate(entry)}%`}
													></div>
												</div>
												<span class="ml-2 text-xs font-medium text-yellow-400"
													>{metrics.calculateSuccessRate(entry)}%</span
												>
											</div>
										{:else}
											<span class="text-xs text-slate-500">No predictions</span>
										{/if}
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td colspan="7" class="py-6 text-center text-slate-400">
									{searchQuery
										? 'No players match your search'
										: 'No players found in the leaderboard'}
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Legend simplified -->
		<div class="mt-10">
			<div class="relative overflow-hidden bg-slate-800/50 p-5">
				<div>
					<h3 class="font-display mb-3 text-lg font-semibold text-white">Scoring</h3>
					<ul class="grid gap-2 text-base text-slate-300 sm:grid-cols-3">
						<li class="flex items-center">
							<span class="mr-2 inline-block h-2.5 w-2.5 bg-green-500"></span>Perfect Score: 3 pts
						</li>
						<li class="flex items-center">
							<span class="mr-2 inline-block h-2.5 w-2.5 bg-blue-500"></span>Outcome: 1 pt
						</li>
						<li class="flex items-center">
							<span class="mr-2 inline-block h-2.5 w-2.5 bg-yellow-500"></span>Success Rate: %
							scoring predictions
						</li>
					</ul>
					<p class="mt-3 text-[11px] leading-relaxed text-slate-400">
						Multipliers (2× / 3×) apply to select fixtures. Success rate = predictions that earned
						any points.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
