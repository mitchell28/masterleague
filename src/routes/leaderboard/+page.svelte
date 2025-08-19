<script lang="ts">
	import { goto } from '$app/navigation';
	import { type PageData } from './$types';
	import { ChevronUp } from '@lucide/svelte';
	import { useLeaderboardSorting } from './hooks';

	// Props and state
	let { data } = $props<{ data: PageData }>();

	// Update leaderboard when data changes (reactive to server load updates)
	let leaderboard = $derived(data.leaderboard || []);

	// Use custom hooks
	const sorting = useLeaderboardSorting(() => leaderboard, {
		defaultSortKey: 'score',
		defaultSortDirection: 'desc'
	});

	$inspect(sorting.sortedData);
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
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-6xl px-4 sm:px-6">
		<!-- Leaderboard table clean card with mobile responsive design -->
		<div class="overflow-hidden bg-slate-800/50">
			<!-- Mobile Card View (visible on small screens) -->
			<div class="block sm:hidden">
				{#if sorting.sortedData && sorting.sortedData.length > 0}
					{#each sorting.sortedData as entry, index}
						<button
							type="button"
							class="focus:ring-accent w-full cursor-pointer border-b border-slate-700/60 p-4 text-left transition-colors hover:bg-slate-700/30 focus:bg-slate-700/30 focus:ring-2 focus:outline-none focus:ring-inset"
							onclick={() => goto(`/leaderboard/${entry.userId}/${data.currentWeek}`)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									goto(`/leaderboard/${entry.userId}/${data.currentWeek}`);
								}
							}}
							aria-label="View predictions for {entry.username}"
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
									{entry.points || 0} pts
								</div>
							</div>

							<div class="grid grid-cols-1 gap-3 text-center">
								<div>
									<div class="mb-1 text-xs tracking-wide text-slate-400 uppercase">Correct</div>
									<div class="text-sm font-medium text-green-400">
										{entry.correctScorelines || 0}
									</div>
								</div>
							</div>
						</button>
					{/each}
				{:else}
					<div class="py-8 text-center text-sm text-slate-400">
						No players found in the leaderboard
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
								onclick={() => sorting.toggleSort('score')}
							>
								<div class="flex items-center justify-center">
									<span>Points</span>
									<ChevronUp
										size={16}
										class={`ml-1 text-slate-400 ${sorting.sortKey === 'score' ? (sorting.sortDirection === 'asc' ? 'rotate-180' : '') : ''}`}
									/>
								</div>
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase hover:text-white"
								onclick={() => sorting.toggleSort('correctScorelines')}
							>
								<div class="flex items-center justify-center">
									<span>Correct</span>
									<ChevronUp
										size={16}
										class={`ml-1 text-slate-400 ${sorting.sortKey === 'correctScorelines' ? (sorting.sortDirection === 'asc' ? 'rotate-180' : '') : ''}`}
									/>
								</div>
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-700/60">
						{#if sorting.sortedData && sorting.sortedData.length > 0}
							{#each sorting.sortedData as entry, index}
								<tr
									class="cursor-pointer transition-colors hover:bg-slate-700/30"
									onclick={() => goto(`/leaderboard/${entry.userId}/${data.currentWeek}`)}
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
										{entry.score || 0}
									</td>
									<!-- Correct predictions -->
									<td
										class="px-4 py-3 text-center text-base font-medium whitespace-nowrap text-green-400"
									>
										{entry.correctScorelines || 0}
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td colspan="3" class="py-8 text-center text-sm text-slate-400">
									No players found in the leaderboard
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
							<span class="mr-2 inline-block h-2.5 w-2.5 bg-blue-500"></span>Correct Outcome: 1 pt
						</li>
						<li class="flex items-center">
							<span class="mr-2 inline-block h-2.5 w-2.5 bg-red-500"></span>Incorrect: 0 pts
						</li>
					</ul>
					<p class="mt-3 text-xs leading-relaxed text-slate-400 sm:text-[11px]">
						Multipliers (2× / 3×) apply to select fixtures.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
