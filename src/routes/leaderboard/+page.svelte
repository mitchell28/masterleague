<script lang="ts">
	import { type PageData } from './$types';
	import { ChevronUp, TrendingUp, Loader2, LineChart } from '@lucide/svelte';
	import { useLeaderboardSorting } from './hooks';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { navigating } from '$app/stores';
	import WeekSelector from '$lib/components/WeekSelector.svelte';
	import RankingsChart from '$lib/components/RankingsChart.svelte';

	// Props and state
	let { data } = $props<{ data: PageData }>();

	// Update leaderboard when data changes (reactive to server load updates)
	let leaderboard = $derived(data.leaderboard || []);
	let availableWeeks = $derived(data.availableWeeks || []);
	let selectedWeek = $derived(data.selectedWeek);
	let isWeekView = $derived(selectedWeek !== null);
	
	// Loading state derived from navigating store
	let isLoading = $derived($navigating !== null);

	// Use custom hooks - reactive to view mode changes
	// The server pre-sorts data based on view mode, so we just use the appropriate default
	const sorting = useLeaderboardSorting(() => leaderboard, {
		defaultSortKey: 'score',
		defaultSortDirection: 'desc'
	});

	// Week selector handlers
	function handleWeekChange(newWeek: number) {
		if (newWeek !== selectedWeek) {
			goto(`/leaderboard?week=${newWeek}`);
		}
	}

	function handleNavigate(direction: 'prev' | 'next') {
		const currentWeekIndex = selectedWeek ? availableWeeks.indexOf(selectedWeek) : -1;
		let targetWeek: number;

		if (direction === 'prev') {
			targetWeek = availableWeeks[currentWeekIndex - 1];
		} else {
			targetWeek = availableWeeks[currentWeekIndex + 1];
		}

		if (targetWeek && availableWeeks.includes(targetWeek)) {
			goto(`/leaderboard?week=${targetWeek}`);
		}
	}

	// Toggle between all weeks and week view
	function toggleViewMode() {
		if (isWeekView) {
			goto('/leaderboard');
		} else {
			const latestWeek = availableWeeks[availableWeeks.length - 1] || data.currentWeek;
			goto(`/leaderboard?week=${latestWeek}`);
		}
	}

	// Get display score based on view mode
	function getDisplayScore(entry: any): number {
		if (isWeekView) {
			return entry.cumulativePoints || 0;
		}
		return entry.score || 0;
	}

	// Get display correct score count based on view mode
	function getDisplayCorrect(entry: any): number {
		if (isWeekView) {
			return entry.cumulativeCorrect || 0;
		}
		return entry.correctScorelines || 0;
	}
</script>

<div class="mx-auto">
	<!-- Main Header with clean geometric design and mobile responsive layout -->
	<div class="relative mb-4 sm:mb-6">
		<div class="font-display w-full overflow-hidden bg-slate-900">
			<!-- Main Header Content -->
			<div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
				<!-- Mobile Layout: Stack vertically -->
				<div class="flex flex-col gap-4 sm:hidden">
					<div class="text-center">
						<h1 class="text-2xl font-bold text-white">
							{isWeekView ? `Week ${selectedWeek} Standings` : 'Overall Standings'}
						</h1>
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
					</div>
					
					<!-- Mobile Week Selector -->
					<div class="flex flex-col items-center gap-3">
						<div class="flex items-center justify-center gap-2">
							<!-- Segmented Toggle -->
							<div class="inline-flex border-2 border-slate-700 bg-slate-800">
								<button
									onclick={toggleViewMode}
									class="min-h-11 px-3 text-xs font-medium transition-all {!isWeekView ? 'bg-accent text-black' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}"
								>
									Overall
								</button>
								<button
									onclick={toggleViewMode}
									class="min-h-11 px-3 text-xs font-medium transition-all {isWeekView ? 'bg-accent text-black' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}"
								>
									Weekly
								</button>
							</div>
							
							{#if isWeekView && selectedWeek}
								<WeekSelector
									weeks={availableWeeks}
									currentWeek={data.currentWeek}
									week={selectedWeek}
									onWeekChange={handleWeekChange}
									onNavigate={handleNavigate}
								/>
							{/if}
						</div>
					</div>
				</div>

				<!-- Desktop Layout: Side by side -->
				<div class="hidden sm:block">
					<div class="mb-3 flex items-center justify-between">
						<div>
							<h1 class="text-3xl font-bold text-white lg:text-4xl">
								{isWeekView ? `Week ${selectedWeek} Standings` : 'Overall Standings'}
							</h1>
							<div class="mt-2 flex items-center gap-3">
								<span class="text-sm font-medium text-slate-300">
									{data.selectedOrganization?.name || 'Master League'}
								</span>
							</div>
						</div>
						<div class="flex items-center gap-4">
							<!-- Segmented Toggle -->
							<div class="inline-flex border-2 border-slate-700 bg-slate-800">
								<button
									onclick={toggleViewMode}
									class="min-h-10 px-4 text-sm font-medium transition-all {!isWeekView ? 'bg-accent text-black' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}"
								>
									Overall
								</button>
								<button
									onclick={toggleViewMode}
									class="min-h-10 px-4 text-sm font-medium transition-all {isWeekView ? 'bg-accent text-black' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}"
								>
									Weekly
								</button>
							</div>
							
							<!-- Week Selector - Only show when in week view -->
							{#if isWeekView && selectedWeek}
								<WeekSelector
									weeks={availableWeeks}
									currentWeek={data.currentWeek}
									week={selectedWeek}
									onWeekChange={handleWeekChange}
									onNavigate={handleNavigate}
								/>
							{/if}
							
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
		</div>
	</div>

	<div class="mx-auto max-w-6xl px-4 sm:px-6">
		<!-- Leaderboard table clean card with mobile responsive design -->
		<div class="relative overflow-hidden bg-slate-900">
			<!-- Loading Overlay -->
			{#if isLoading}
				<div class="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
					<div class="flex flex-col items-center gap-3">
						<Loader2 size={32} class="animate-spin text-indigo-400" />
						<span class="text-sm font-medium text-slate-300">Loading...</span>
					</div>
				</div>
			{/if}
			
			<!-- Mobile Card View (visible on small screens) -->
			<div class="block sm:hidden">
				{#if sorting.sortedData && sorting.sortedData.length > 0}
					{#each sorting.sortedData as entry, index}
						<a
							class="group block w-full cursor-pointer border-b border-slate-700/50 text-left transition-all duration-200 last:border-b-0 hover:bg-slate-700/30 focus:bg-slate-700/30 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none focus:ring-inset active:bg-slate-700/40"
							href={`/leaderboard/${entry.userId}/${data.currentWeek}`}
							aria-label="View predictions for {entry.username}"
						>
							<!-- Main content row -->
							<div class="p-4">
								<div class="flex items-center justify-between">
									<!-- Left side: Rank and name -->
									<div class="flex items-center space-x-3">
										<div
											class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700/60 text-sm font-bold text-slate-200"
										>
											{index + 1}
										</div>
										<div class="min-w-0 flex-1">
											<h3 class="truncate text-sm font-semibold text-white">
												{entry?.username || 'Anonymous'}
											</h3>
										</div>
									</div>
									<!-- Right side: Total points -->
									<div class="ml-4 text-right">
										<div class="text-lg font-bold text-indigo-300">
											{getDisplayScore(entry)}
										</div>
										<div class="text-xs text-slate-400">points</div>
									</div>
								</div>

								<!-- Stats row -->
								<div class="mt-3 flex items-center justify-between pt-2 text-xs">
									<div class="flex items-center space-x-1">
										<span class="text-slate-400">Correct:</span>
										<span class="font-medium text-green-400">
											{getDisplayCorrect(entry)}
										</span>
									</div>
									{#if isWeekView}
										<div class="flex items-center space-x-1">
											<span class="text-slate-400">Week {selectedWeek}:</span>
											<span class="font-medium text-blue-400">
												+{entry.weeklyFilteredScore || 0}
											</span>
										</div>
									{:else}
										<div class="flex items-center space-x-1">
											<span class="text-slate-400">Week {data.currentWeek}:</span>
											<span
												class="font-medium {entry.weeklyPoints > 0
													? 'text-blue-400'
													: 'text-slate-500'}"
											>
												{entry.weeklyPoints > 0 ? `+${entry.weeklyPoints}` : '0'}
											</span>
										</div>
									{/if}
								</div>
							</div>

							<!-- View Stats Button for Mobile -->
							<div class="px-4 pb-3">
								<div
									class="cursor-pointer border border-slate-600/50 bg-slate-700/50 px-3 py-1.5 text-center text-xs font-medium text-slate-300 transition-colors duration-200 group-hover:border-slate-500/70 group-hover:bg-slate-600/70 hover:border-slate-500/70 hover:bg-slate-600/70 hover:text-white"
								>
									View Stats
								</div>
							</div>
						</a>
					{/each}
				{:else}
					<div class="py-8 text-center text-sm text-slate-400">
						No players found in the leaderboard
					</div>
				{/if}
			</div>

			<!-- Desktop Table View (hidden on small screens) -->
			<div class="hidden sm:block">
				<table class="min-w-full divide-y divide-slate-700/70">
					<thead class="bg-slate-900/50">
						<tr>
							<th
								class="w-[40%] cursor-pointer px-4 py-3 text-left text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase hover:text-white"
							>
								<div class="flex items-center">
									<span>Player</span>
								</div>
							</th>
							<th
								class="w-[20%] cursor-pointer px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase hover:text-white"
								onclick={() => sorting.toggleSort(isWeekView ? 'cumulativePoints' : 'score')}
							>
								<div class="flex items-center justify-center">
									<span>Total Points</span>
									<ChevronUp
										size={16}
										class={`ml-1 text-slate-400 ${(isWeekView ? sorting.sortKey === 'cumulativePoints' : sorting.sortKey === 'score') ? (sorting.sortDirection === 'asc' ? 'rotate-180' : '') : ''}`}
									/>
								</div>
							</th>
							<th
								class="w-[20%] cursor-pointer px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase hover:text-white"
								onclick={() => sorting.toggleSort(isWeekView ? 'cumulativeCorrect' : 'correctScorelines')}
							>
								<div class="flex items-center justify-center">
									<span>Correct</span>
									<ChevronUp
										size={16}
										class={`ml-1 text-slate-400 ${(isWeekView ? sorting.sortKey === 'cumulativeCorrect' : sorting.sortKey === 'correctScorelines') ? (sorting.sortDirection === 'asc' ? 'rotate-180' : '') : ''}`}
									/>
								</div>
							</th>
							{#if !isWeekView}
								<th
									class="w-[20%] cursor-pointer px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase hover:text-white"
									onclick={() => sorting.toggleSort('weeklyPoints')}
								>
									<div class="flex items-center justify-center">
										<span>Week {data.currentWeek}</span>
										<ChevronUp
											size={16}
											class={`ml-1 text-slate-400 ${sorting.sortKey === 'weeklyPoints' ? (sorting.sortDirection === 'asc' ? 'rotate-180' : '') : ''}`}
										/>
									</div>
								</th>
							{:else}
								<th
									class="w-[20%] px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase"
									title="Points for Week {selectedWeek}"
								>
									<span>Week {selectedWeek}</span>
								</th>
							{/if}
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-700/60">
						{#if sorting.sortedData && sorting.sortedData.length > 0}
							{#each sorting.sortedData as entry, index}
								<tr
									class="group cursor-pointer transition-all duration-200 hover:scale-[1.005] hover:bg-slate-700/30 hover:shadow-lg"
								>
									<td colspan="4" class="p-0">
										<a
											href={`/leaderboard/${entry.userId}/${isWeekView ? selectedWeek : data.currentWeek}`}
											class="flex w-full cursor-pointer"
											aria-label="View predictions for {entry.username}"
										>
											<!-- Player name and rank -->
											<div class="w-[40%] flex-none px-4 py-3 whitespace-nowrap">
												<div class="flex items-center">
													<div
														class="mr-3 flex h-8 w-8 items-center justify-center
															rounded-full bg-slate-700/80 text-sm font-bold text-slate-300 transition-all group-hover:shadow-md"
													>
														{index + 1}
													</div>
													<div>
														<div
															class="text-sm font-medium tracking-wide text-white transition-colors group-hover:text-indigo-200"
														>
															{entry?.username || 'Anonymous'}
														</div>
													</div>
												</div>
											</div>
											<!-- Points (total or week depending on view) -->
											<div
												class="flex w-[20%] flex-none items-center justify-center px-4 py-3 text-center text-base font-bold whitespace-nowrap text-indigo-300 transition-colors group-hover:text-indigo-200"
											>
												{getDisplayScore(entry)}
											</div>
												<!-- Correct predictions -->
												<div
													class="flex w-[20%] flex-none items-center justify-center px-4 py-3 text-center text-base font-medium whitespace-nowrap text-green-400 transition-colors group-hover:text-green-300"
												>
													{getDisplayCorrect(entry)}
											</div>
											<!-- Context column (current week points or cumulative total) -->
											<div
												class="flex w-[20%] flex-none items-center justify-center px-4 py-3 text-center text-base font-medium whitespace-nowrap transition-colors group-hover:text-blue-300"
											>
												{#if isWeekView}
													<!-- Show weekly points for selected week -->
													<span class="text-blue-400" title="Points for Week {selectedWeek}">+{entry.weeklyFilteredScore || 0}</span>
												{:else}
													<!-- Show current week points when in overview -->
													{#if entry.weeklyPoints > 0}
														<div class="flex items-center justify-center text-blue-400">
															<span class="font-semibold">+{entry.weeklyPoints}</span>
														</div>
													{:else}
														<span class="text-slate-500">0</span>
													{/if}
												{/if}
											</div>
										</a>
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td colspan="4" class="py-8 text-center text-sm text-slate-400">
									No players found in the leaderboard
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Rankings Chart -->
		<div class="mt-8">
			<RankingsChart 
				rankingHistory={data.rankingHistory || []} 
				availableWeeks={data.availableWeeks || []} 
				currentUserId={data.currentUserId || ''} 
			/>
		</div>

		<!-- Legend simplified with mobile responsive design -->
		<div class=" bg-slate-900 my-6 sm:mt-10">
			<div class="relative overflow-hidden p-4 sm:p-5">
				<div>
					<h3 class="font-display mb-3 text-base font-semibold text-white sm:text-lg">Scoring</h3>
					<p class="mb-3 text-xs leading-relaxed text-slate-400 sm:hidden sm:text-[11px]">
						Multipliers (2× / 3×) apply to select fixtures.
					</p>
					<ul class="grid gap-2 text-sm text-slate-300 sm:grid-cols-3 sm:text-base">
						<li class="flex items-center">
							<span class="mr-2 inline-block h-2.5 w-2.5 bg-green-500"></span>Correct Score: 3 pts
						</li>
						<li class="flex items-center">
							<span class="mr-2 inline-block h-2.5 w-2.5 bg-blue-500"></span>Outcome: 1 pt
						</li>
						<li class="flex items-center">
							<span class="mr-2 inline-block h-2.5 w-2.5 bg-red-500"></span>Incorrect: 0 pts
						</li>
					</ul>
					<p class="mt-3 hidden text-xs leading-relaxed text-slate-400 sm:block sm:text-[11px]">
						Multipliers (2× / 3×) apply to select fixtures.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
