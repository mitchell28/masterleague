<script lang="ts">
	import { goto } from '$app/navigation';

	type LeaderboardEntry = {
		userId: string;
		userName: string;
		points: number;
		correctScorelines: number;
		correctOutcomes: number;
		predictedFixtures: number;
		completedFixtures: number;
		rank: number;
	};

	// Use runes syntax
	let { data } = $props<{ data: { leaderboard: LeaderboardEntry[] } }>();

	// Access leaderboard data with debug info
	let leaderboard = $derived(data?.leaderboard || []);

	// Track hovered row for styling
	let hoveredRow: number | null = $state(null);

	// Add some additional derived values for display
	let totalEntries = $derived(leaderboard.length);
</script>

<div class="container mx-auto px-4 py-4 sm:py-8">
	<div class="mb-4 text-center sm:mb-8">
		<h1 class="mb-2 text-3xl font-bold text-white sm:text-4xl">
			<span class="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
				Leaderboard
			</span>
		</h1>
		<p class="text-sm text-slate-300 sm:text-base">
			Click on a user to view their detailed prediction history
		</p>
	</div>

	<!-- Debug info to verify what data is available -->
	<!-- <pre class="mb-4 overflow-auto rounded bg-slate-900 p-4 text-xs text-green-400">
		{JSON.stringify(leaderboard, null, 2)}
	</pre> -->

	<div
		class="overflow-x-scroll rounded-lg border border-slate-700/50 bg-slate-800/70 p-1 shadow-xl backdrop-blur-md"
	>
		<table class="min-w-full divide-y divide-slate-700/50">
			<thead>
				<tr class="bg-slate-800/80">
					<th
						class="px-2 py-3 text-left text-xs font-medium tracking-wider text-white uppercase sm:px-6 sm:py-4"
					>
						Rank
					</th>
					<th
						class="px-2 py-3 text-left text-xs font-medium tracking-wider text-white uppercase sm:px-6 sm:py-4"
					>
						Name
					</th>
					<th
						class="px-2 py-3 text-center text-xs font-medium tracking-wider text-white uppercase sm:px-6 sm:py-4"
					>
						Points
					</th>
					<th
						class="hidden px-2 py-3 text-center text-xs font-medium tracking-wider text-white uppercase sm:table-cell sm:px-6 sm:py-4"
					>
						Correct <span class="hidden md:inline">Scores</span>
					</th>
					<th
						class="hidden px-2 py-3 text-center text-xs font-medium tracking-wider text-white uppercase sm:table-cell sm:px-6 sm:py-4"
					>
						Correct <span class="hidden md:inline">Outcomes</span>
					</th>
					<th
						class="hidden px-2 py-3 text-center text-xs font-medium tracking-wider text-white uppercase sm:px-6 sm:py-4 md:table-cell"
					>
						Pred/Comp
					</th>
					<th
						class="hidden px-2 py-3 text-center text-xs font-medium tracking-wider text-white uppercase sm:px-6 sm:py-4 lg:table-cell"
					>
						Success Rate
					</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-700/50">
				{#if !leaderboard || leaderboard.length === 0}
					<tr>
						<td
							colspan="7"
							class="px-2 py-6 text-center text-base font-medium text-white sm:px-6 sm:py-8 sm:text-lg"
						>
							No entries yet
						</td>
					</tr>
				{:else}
					{#each leaderboard as entry, index}
						<!-- Debug to see what's in each entry -->
						<!-- <tr><td colspan="7"><pre class="text-xs">{JSON.stringify(entry)}</pre></td></tr> -->
						<tr
							tabindex="0"
							data-user-id={entry.userId}
							onclick={() => goto(`/leaderboard/user/${entry.userId}`)}
							onkeydown={(e) => e.key === 'Enter' && goto(`/leaderboard/user/${entry.userId}`)}
							onfocus={() => (hoveredRow = index)}
							onblur={() => (hoveredRow = null)}
							class="cursor-pointer transition-colors {index === 0
								? 'bg-yellow-900/30'
								: index < 3
									? 'bg-slate-800/50'
									: 'bg-slate-800/20'} {hoveredRow === index
								? 'bg-slate-700'
								: 'hover:bg-slate-700/70'}"
						>
							<td
								class="px-2 py-2 text-sm font-medium whitespace-nowrap text-white sm:px-6 sm:py-4"
							>
								<span
									class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 sm:text-sm {index ===
									0
										? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-[0_0_10px_rgba(255,215,0,0.5)]'
										: index === 1
											? 'bg-gradient-to-r from-slate-300 to-slate-400 text-black'
											: index === 2
												? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
												: 'bg-slate-700 text-white'}"
								>
									{entry.rank || index + 1}
								</span>
							</td>
							<td
								class="px-2 py-2 text-xs font-semibold whitespace-nowrap text-white sm:px-6 sm:py-4 sm:text-sm"
							>
								{entry.userName || 'Unknown User'}
							</td>
							<td
								class="px-2 py-2 text-center text-sm font-bold text-white sm:px-6 sm:py-4 sm:text-base"
							>
								{entry.points || 0}
							</td>
							<td
								class="hidden px-2 py-2 text-center text-xs font-medium text-green-400 sm:table-cell sm:px-6 sm:py-4 sm:text-sm"
							>
								{entry.correctScorelines || 0}
								<span class="text-xs font-medium text-slate-300">
									({(entry.correctScorelines || 0) * 3})
								</span>
							</td>
							<td
								class="hidden px-2 py-2 text-center text-xs font-medium text-blue-400 sm:table-cell sm:px-6 sm:py-4 sm:text-sm"
							>
								{entry.correctOutcomes || 0}
							</td>
							<td
								class="hidden px-2 py-2 text-center text-xs font-medium text-white sm:px-6 sm:py-4 sm:text-sm md:table-cell"
							>
								{entry.predictedFixtures || 0}/{entry.completedFixtures || 0}
							</td>
							<td
								class="hidden px-2 py-2 text-center text-xs font-medium text-yellow-400 sm:px-6 sm:py-4 sm:text-sm lg:table-cell"
							>
								{entry.completedFixtures
									? Math.round(
											((entry.correctScorelines + entry.correctOutcomes) /
												entry.completedFixtures) *
												100
										)
									: 0}%
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	{#if totalEntries > 0}
		<div class="mt-2 text-right text-xs font-medium text-white sm:mt-4 sm:text-sm">
			Total entries: {totalEntries}
		</div>
	{/if}
</div>
