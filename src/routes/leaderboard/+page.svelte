<script lang="ts">
	import { type PageData } from './$types';
	import { goto } from '$app/navigation';
	import { ChevronUp, RefreshCcw, SearchIcon } from '@lucide/svelte';
	import { useAutoRefresh } from '$lib/hooks';
	import { useLeaderboardMetrics } from './hooks';

	// Props and state
	let { data } = $props<{ data: PageData }>();

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
		const filtered = leaderboard.filter((entry: any) => {
			const username = (entry.username || '').toLowerCase();
			return username.includes(query);
		});

		return filtered;
	});

	let sortedData = $derived(() => {
		const data = filteredData();
		if (!data) return [];

		const sorted = [...data].sort((a: any, b: any) => {
			// Special case for totalPoints - include tiebreakers
			if (sortKey === 'totalPoints') {
				const aPoints = a.totalPoints || 0;
				const bPoints = b.totalPoints || 0;

				if (aPoints !== bPoints) {
					return sortDirection === 'desc' ? bPoints - aPoints : aPoints - bPoints;
				}

				// First tiebreaker: correct scorelines
				const aScorelines = a.correctScorelines || 0;
				const bScorelines = b.correctScorelines || 0;
				if (aScorelines !== bScorelines) {
					return sortDirection === 'desc' ? bScorelines - aScorelines : aScorelines - bScorelines;
				}

				// Second tiebreaker: correct outcomes
				const aOutcomes = a.correctOutcomes || 0;
				const bOutcomes = b.correctOutcomes || 0;
				if (aOutcomes !== bOutcomes) {
					return sortDirection === 'desc' ? bOutcomes - aOutcomes : aOutcomes - bOutcomes;
				}

				// Final tiebreaker: alphabetical by username
				const aName = (a.username || '').toLowerCase();
				const bName = (b.username || '').toLowerCase();
				return aName.localeCompare(bName);
			}

			// For other columns, do standard sorting
			const valueA = a[sortKey] || (typeof a[sortKey] === 'number' ? 0 : '');
			const valueB = b[sortKey] || (typeof b[sortKey] === 'number' ? 0 : '');

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

		return sorted;
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
		goto(`/leaderboard/${userId}/${data.currentWeek}`);
	}
</script>

<div class="mx-auto mt-22">
	<!-- Main Header with clean geometric design and mobile responsive layout -->
	<div class="relative mb-4 sm:mb-6">
		<div class="font-display w-full overflow-hidden bg-slate-900">
			<!-- Main Header Content -->
			<div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
				<!-- Mobile Layout: Stack vertically -->
				<div class="flex flex-col gap-4 sm:hidden">
					<div class="text-center">
						<h1 class="text-2xl font-bold text-white">Overall Standings</h1>
						<div class="mt-2 flex flex-col items-center gap-2">
							<span class="text-xs font-medium text-slate-300">
								{data.selectedOrganization?.name || 'Master League'}
							</span>
							<div class="flex items-center gap-3 text-sm text-slate-400">
								<div>Week <span class="font-semibold text-white">{data.currentWeek}</span></div>
								<div>
									Players <span class="font-semibold text-white">{leaderboard.length}</span>
								</div>
							</div>
						</div>

						<!-- Mobile Refresh Button -->
						<div class="mt-3">
							<button
								class="bg-accent hover:bg-accent/80 font-display relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold tracking-wide text-black transition disabled:cursor-not-allowed disabled:opacity-50"
								onclick={autoRefresh.refresh}
								disabled={autoRefresh.isRefreshing}
							>
								<RefreshCcw
									size={12}
									class={`mr-1.5 ${autoRefresh.isRefreshing ? 'animate-spin' : ''}`}
								/>
								{autoRefresh.isRefreshing ? 'Refreshing...' : 'Refresh'}
							</button>
						</div>
					</div>
				</div>

				<!-- Desktop Layout: Side by side -->
				<div class="hidden sm:block">
					<div class="mb-3 flex items-center justify-between">
						<div>
							<h1 class="text-3xl font-bold text-white lg:text-4xl">Overall Standings</h1>
							<div class="mt-2 flex items-center gap-3">
								<span class="text-sm font-medium text-slate-300">
									{data.selectedOrganization?.name || 'Master League'}
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

					<!-- Desktop Refresh Button -->
					<div class="flex justify-end">
						<button
							class="bg-accent hover:bg-accent/80 font-display relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold tracking-wide text-black transition disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
							onclick={autoRefresh.refresh}
							disabled={autoRefresh.isRefreshing}
						>
							<RefreshCcw
								size={12}
								class={`mr-1.5 ${autoRefresh.isRefreshing ? 'animate-spin' : ''} sm:h-3.5 sm:w-3.5`}
							/>
							{autoRefresh.isRefreshing ? 'Refreshing...' : 'Refresh'}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-6xl px-4 sm:px-6">
		<!-- Controls and filters (clean layout with mobile responsive design) -->
		<div
			class="mb-6 flex flex-col gap-4 bg-slate-800/50 px-4 py-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:px-6"
		>
			<!-- Search input -->
			<div class="order-1 sm:order-1">
				<div class="relative">
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search players..."
						class="w-full bg-slate-700/80 px-3 py-3 text-sm text-white placeholder-slate-400 transition outline-none focus:bg-slate-700 sm:w-64 sm:py-2"
					/>
					<SearchIcon class="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400" size={16} />
				</div>
			</div>

			<!-- Right side controls -->
			<div class="order-2 flex flex-col gap-3 sm:order-2 sm:flex-row sm:items-center sm:gap-4">
				<!-- Last refresh timestamp -->
				<span class="text-xs text-slate-400 sm:text-sm">
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
							class="peer h-6 w-11 bg-slate-700 peer-checked:bg-indigo-600 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"
						></div>
						<span class="ml-2 text-sm font-medium text-slate-300 sm:text-base">Auto refresh</span>
					</label>
				</div>
			</div>
		</div>

		<!-- Leaderboard table clean card with mobile responsive design -->
		<div class="overflow-hidden bg-slate-800/50">
			<!-- Mobile Card View (visible on small screens) -->
			<div class="block sm:hidden">
				{#if sortedData() && sortedData().length > 0}
					{#each sortedData() as entry, index}
						<div
							class="cursor-pointer border-b border-slate-700/60 p-4 transition-colors hover:bg-slate-700/30"
							onclick={() => viewUserPredictions(entry.id)}
						>
							<div class="mb-3 flex items-center justify-between">
								<div class="flex items-center">
									<div
										class="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-700/80 text-sm font-bold text-slate-300"
									>
										{index + 1}
									</div>
									<div>
										<div class="text-sm font-medium tracking-wide text-white">
											{entry?.username || 'Anonymous'}
										</div>
									</div>
								</div>
								<div class="text-lg font-bold text-indigo-300">
									{entry.totalPoints || 0} pts
								</div>
							</div>

							<div class="grid grid-cols-3 gap-3 text-center">
								<div>
									<div class="mb-1 text-xs tracking-wide text-slate-400 uppercase">Perfect</div>
									<div class="text-sm font-medium text-green-400">
										{entry.correctScorelines || 0}
									</div>
								</div>
								<div>
									<div class="mb-1 text-xs tracking-wide text-slate-400 uppercase">Outcome</div>
									<div class="text-sm font-medium text-blue-400">{entry.correctOutcomes || 0}</div>
								</div>
								<div>
									<div class="mb-1 text-xs tracking-wide text-slate-400 uppercase">Rate</div>
									{#if (entry.completedFixtures || 0) > 0}
										<div class="text-sm font-medium text-yellow-400">
											{metrics.calculateSuccessRate(entry)}%
										</div>
									{:else if (entry.predictedFixtures || 0) > 0}
										<div class="text-xs text-slate-400">Awaiting</div>
									{:else}
										<div class="text-xs text-slate-500">-</div>
									{/if}
								</div>
							</div>

							<div class="mt-3 flex justify-between text-xs text-slate-400">
								<span>Predictions: {entry.predictedFixtures || 0}</span>
								<span>Completed: {entry.completedFixtures || 0}</span>
							</div>
						</div>
					{/each}
				{:else}
					<div class="py-8 text-center text-sm text-slate-400">
						{searchQuery ? 'No players match your search' : 'No players found in the leaderboard'}
					</div>
				{/if}
			</div>

			<!-- Desktop Table View (hidden on small screens) -->
			<div class="hidden overflow-x-auto sm:block">
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
								onclick={() => toggleSort('correctScorelines')}
							>
								<div class="flex items-center justify-center">
									<span>Perfect</span>
									<ChevronUp
										size={16}
										class={`ml-1 text-slate-400 ${sortKey === 'correctScorelines' ? (sortDirection === 'asc' ? 'rotate-180' : '') : ''}`}
									/>
								</div>
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase hover:text-white"
								onclick={() => toggleSort('correctOutcomes')}
							>
								<div class="flex items-center justify-center">
									<span>Outcome</span>
									<ChevronUp
										size={16}
										class={`ml-1 text-slate-400 ${sortKey === 'correctOutcomes' ? (sortDirection === 'asc' ? 'rotate-180' : '') : ''}`}
									/>
								</div>
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase hover:text-white"
								onclick={() => toggleSort('predictedFixtures')}
							>
								<div class="flex items-center justify-center">
									<span>Predictions</span>
									<ChevronUp
										size={16}
										class={`ml-1 text-slate-400 ${sortKey === 'predictedFixtures' ? (sortDirection === 'asc' ? 'rotate-180' : '') : ''}`}
									/>
								</div>
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase hover:text-white"
								onclick={() => toggleSort('completedFixtures')}
							>
								<div class="flex items-center justify-center">
									<span>Completed</span>
									<ChevronUp
										size={16}
										class={`ml-1 text-slate-400 ${sortKey === 'completedFixtures' ? (sortDirection === 'asc' ? 'rotate-180' : '') : ''}`}
									/>
								</div>
							</th>
							<th
								class="px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase"
							>
								<span>Success Rate</span>
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
												<div class="text-sm font-medium tracking-wide text-white">
													{entry?.username || 'Anonymous'}
												</div>
											</div>
										</div>
									</td>
									<!-- Total points -->
									<td
										class="px-4 py-3 text-center text-base font-bold whitespace-nowrap text-indigo-300"
									>
										{entry.totalPoints || 0}
									</td>
									<!-- Perfect score predictions -->
									<td
										class="px-4 py-3 text-center text-base font-medium whitespace-nowrap text-green-400"
									>
										{entry.correctScorelines || 0}
									</td>
									<!-- Correct outcome predictions -->
									<td
										class="px-4 py-3 text-center text-base font-medium whitespace-nowrap text-blue-400"
									>
										{entry.correctOutcomes || 0}
									</td>
									<!-- Total predictions -->
									<td
										class="px-4 py-3 text-center text-base font-medium whitespace-nowrap text-purple-300"
									>
										{entry.predictedFixtures || 0}
									</td>
									<!-- Completed fixtures -->
									<td
										class="px-4 py-3 text-center text-base font-medium whitespace-nowrap text-slate-400"
									>
										{entry.completedFixtures || 0}
									</td>
									<!-- Success rate -->
									<td class="px-4 py-3 text-center whitespace-nowrap">
										{#if (entry.completedFixtures || 0) > 0}
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
										{:else if (entry.predictedFixtures || 0) > 0}
											<span class="text-xs text-slate-400">Awaiting results</span>
										{:else}
											<span class="text-xs text-slate-500">Season not started</span>
										{/if}
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td colspan="7" class="py-8 text-center text-sm text-slate-400">
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

		<!-- Legend simplified with mobile responsive design -->
		<div class="mt-6 sm:mt-10">
			<div class="relative overflow-hidden bg-slate-800/50 p-4 sm:p-5">
				<div>
					<h3 class="font-display mb-3 text-base font-semibold text-white sm:text-lg">Scoring</h3>
					<ul class="grid gap-2 text-sm text-slate-300 sm:grid-cols-3 sm:text-base">
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
					<p class="mt-3 text-xs leading-relaxed text-slate-400 sm:text-[11px]">
						Multipliers (2× / 3×) apply to select fixtures. Success rate = predictions that earned
						any points.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
