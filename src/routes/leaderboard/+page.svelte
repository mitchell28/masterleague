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

<div class="container mx-auto max-w-6xl px-4 py-8 pt-24">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-white">
			<span class="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
				Leaderboard
			</span>
		</h1>
		<p class="text-slate-400">See who's leading the Premier League prediction competition</p>
	</div>

	<!-- Group Selector -->
	{#if data.userGroups && data.userGroups.length > 1}
		<div class="mb-6">
			<label for="group-selector" class="mb-2 block text-sm font-medium text-slate-300"
				>Select Group:</label
			>
			<select
				id="group-selector"
				class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
				value={data.selectedGroup?.id}
				onchange={(e) => {
					const groupId = (e.target as HTMLSelectElement).value;
					goto(`/leaderboard?group=${groupId}`);
				}}
			>
				{#each data.userGroups as group}
					<option value={group.id}>{group.name}</option>
				{/each}
			</select>
		</div>
	{:else if data.selectedGroup}
		<div class="mb-6">
			<div class="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
				<h2 class="text-lg font-semibold text-white">{data.selectedGroup.name}</h2>
				{#if data.selectedGroup.description}
					<p class="text-sm text-slate-400">{data.selectedGroup.description}</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Controls and filters -->
	<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<!-- Search input -->
			<div class="relative">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search players..."
					class="w-64 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
				/>
				<SearchIcon class="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400" size={16} />
			</div>
		</div>

		<div class="flex items-center gap-3">
			<!-- Last refresh timestamp -->
			<span class="text-xs text-slate-400">
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
						class="peer h-5 w-9 rounded-full bg-slate-700 peer-checked:bg-indigo-600 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-slate-600 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"
					></div>
					<span class="ml-2 text-xs font-medium text-slate-300">Auto refresh</span>
				</label>
			</div>

			<!-- Refresh button -->
			<button
				class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow transition-opacity hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
				onclick={autoRefresh.refresh}
				disabled={autoRefresh.isRefreshing}
			>
				<RefreshCcw
					size={16}
					class={`mr-2 text-white ${autoRefresh.isRefreshing ? 'animate-spin' : ''}`}
				/>
				{autoRefresh.isRefreshing ? 'Refreshing...' : 'Refresh'}
			</button>
		</div>
	</div>

	<!-- Leaderboard table -->
	<div class="rounded-lg border border-slate-700 bg-slate-800/50 shadow-lg">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-700">
				<thead>
					<tr>
						<th
							class="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-slate-400 uppercase hover:text-white"
						>
							<div class="flex items-center">
								<span>Player</span>
							</div>
						</th>
						<th
							class="cursor-pointer px-4 py-3 text-center text-xs font-medium tracking-wider whitespace-nowrap text-slate-400 uppercase hover:text-white"
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
							class="cursor-pointer px-4 py-3 text-center text-xs font-medium tracking-wider whitespace-nowrap text-slate-400 uppercase hover:text-white"
						>
							<div class="flex items-center justify-center">
								<span>Perfect</span>
							</div>
						</th>
						<th
							class="cursor-pointer px-4 py-3 text-center text-xs font-medium tracking-wider whitespace-nowrap text-slate-400 uppercase hover:text-white"
						>
							<div class="flex items-center justify-center">
								<span>Outcome</span>
							</div>
						</th>
						<th
							class="cursor-pointer px-4 py-3 text-center text-xs font-medium tracking-wider whitespace-nowrap text-slate-400 uppercase hover:text-white"
						>
							<div class="flex items-center justify-center">
								<span>Predictions</span>
							</div>
						</th>
						<th
							class="cursor-pointer px-4 py-3 text-center text-xs font-medium tracking-wider whitespace-nowrap text-slate-400 uppercase hover:text-white"
						>
							<div class="flex items-center justify-center">
								<span>Completed</span>
							</div>
						</th>
						<th
							class="px-4 py-3 text-center text-xs font-medium tracking-wider whitespace-nowrap text-slate-400 uppercase"
						>
							Success Rate
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-700">
					{#if sortedData() && sortedData().length > 0}
						{#each sortedData() as entry, index}
							<tr
								class="cursor-pointer transition-colors hover:bg-slate-700/50"
								onclick={() => viewUserPredictions(entry.id)}
							>
								<!-- Player name and rank -->
								<td class="px-4 py-3 whitespace-nowrap">
									<div class="flex items-center">
										<div
											class="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-slate-300"
										>
											{index + 1}
										</div>
										<div>
											<div class="font-medium text-white">{entry?.username || 'Anonymous'}</div>
										</div>
									</div>
								</td>
								<!-- Total points -->
								<td class="px-4 py-3 text-center font-bold whitespace-nowrap text-white">
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
								<td class="px-4 py-3 text-center font-medium whitespace-nowrap text-purple-400">
									{entry.predictedFixtures || 0}
								</td>
								<!-- Completed fixtures -->
								<td class="px-4 py-3 text-center font-medium whitespace-nowrap text-slate-300">
									{entry.completedFixtures || 0}
								</td>
								<!-- Success rate -->
								<td class="px-4 py-3 text-center whitespace-nowrap">
									{#if (entry.predictedFixtures || 0) > 0}
										<div class="flex items-center justify-center">
											<div class="h-2 w-16 overflow-hidden rounded-full bg-slate-700">
												<div
													class="h-full bg-yellow-500"
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

	<!-- Legend -->
	<div class="mt-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4 shadow">
		<h3 class="mb-2 font-medium text-white">Scoring Legend</h3>
		<div class="grid gap-2 text-sm sm:grid-cols-3">
			<div class="flex items-center">
				<span class="mr-2 inline-block h-3 w-3 rounded-full bg-green-500"></span>
				<span class="text-slate-300">Perfect Score: 3 points</span>
			</div>
			<div class="flex items-center">
				<span class="mr-2 inline-block h-3 w-3 rounded-full bg-blue-500"></span>
				<span class="text-slate-300">Correct Outcome: 1 point</span>
			</div>
			<div class="flex items-center">
				<span class="mr-2 inline-block h-3 w-3 rounded-full bg-yellow-500"></span>
				<span class="text-slate-300">Success Rate: % of predictions that scored points</span>
			</div>
		</div>
		<p class="mt-2 text-xs text-slate-400">
			Some fixtures have multipliers (2× or 3×). Success rate shows the percentage of your
			predictions that earned any points.
		</p>
	</div>
</div>
