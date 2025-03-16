<script lang="ts">
	import { goto } from '$app/navigation';
	import { Trophy } from '@lucide/svelte';

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

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 text-center">
		<h1 class="mb-2 text-4xl font-bold text-white">
			<span class="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
				Leaderboard
			</span>
		</h1>
		<p class="text-slate-300">Click on a user to view their detailed prediction history</p>
	</div>

	<!-- Debug info to verify what data is available -->
	<!-- <pre class="mb-4 overflow-auto rounded bg-slate-900 p-4 text-xs text-green-400">
		{JSON.stringify(leaderboard, null, 2)}
	</pre> -->

	<div class="rounded-lg border border-slate-700/50 bg-slate-800/70 p-1 shadow-xl backdrop-blur-md">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-700/50">
				<thead>
					<tr class="bg-slate-800/80">
						<th class="px-6 py-4 text-left text-xs font-medium tracking-wider text-white uppercase">
							Rank
						</th>
						<th class="px-6 py-4 text-left text-xs font-medium tracking-wider text-white uppercase">
							Name
						</th>
						<th
							class="px-6 py-4 text-center text-xs font-medium tracking-wider text-white uppercase"
						>
							Points
						</th>
						<th
							class="hidden px-6 py-4 text-center text-xs font-medium tracking-wider text-white uppercase sm:table-cell"
						>
							Exact<span class="hidden md:inline"> Score</span>
						</th>
						<th
							class="hidden px-6 py-4 text-center text-xs font-medium tracking-wider text-white uppercase sm:table-cell"
						>
							Outcome
						</th>
						<th
							class="hidden px-6 py-4 text-center text-xs font-medium tracking-wider text-white uppercase md:table-cell"
						>
							Pred/Comp
						</th>
						<th
							class="hidden px-6 py-4 text-center text-xs font-medium tracking-wider text-white uppercase lg:table-cell"
						>
							Success Rate
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-700/50">
					{#if !leaderboard || leaderboard.length === 0}
						<tr>
							<td colspan="7" class="px-6 py-8 text-center text-lg font-medium text-white">
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
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-white">
									<span
										class="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold {index ===
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
								<td class="px-6 py-4 text-sm font-semibold whitespace-nowrap text-white">
									{entry.userName || 'Unknown User'}
								</td>
								<td class="px-6 py-4 text-center text-base font-bold text-white">
									{entry.points || 0}
								</td>
								<td
									class="hidden px-6 py-4 text-center text-sm font-medium text-green-400 sm:table-cell"
								>
									{entry.correctScorelines || 0}
									<span class="text-xs font-medium text-slate-300">
										({(entry.correctScorelines || 0) * 3})
									</span>
								</td>
								<td
									class="hidden px-6 py-4 text-center text-sm font-medium text-blue-400 sm:table-cell"
								>
									{entry.correctOutcomes || 0}
								</td>
								<td
									class="hidden px-6 py-4 text-center text-sm font-medium text-white md:table-cell"
								>
									{entry.predictedFixtures || 0}/{entry.completedFixtures || 0}
								</td>
								<td
									class="hidden px-6 py-4 text-center text-sm font-medium text-yellow-400 lg:table-cell"
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
	</div>

	{#if totalEntries > 0}
		<div class="mt-4 text-right text-sm font-medium text-white">
			Total entries: {totalEntries}
		</div>
	{/if}
</div>
