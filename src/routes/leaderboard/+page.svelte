<script lang="ts">
	type LeaderboardEntry = {
		userId: string;
		username: string;
		totalPoints: number;
		correctScorelines: number;
		correctOutcomes: number;
	};

	// Use new runes syntax
	let { data } = $props<{ data: { leaderboard: LeaderboardEntry[] } }>();
	let leaderboard = $derived(data.leaderboard || []);

	// Add some additional derived values for display
	let userCount = $derived(leaderboard.length);
	let topScore = $derived(leaderboard.length > 0 ? leaderboard[0].totalPoints : 0);
</script>

<div class="container mx-auto px-10 py-8">
	<h1 class="mb-6 text-3xl font-bold text-white">Master League Table</h1>

	<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
		<div class="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow">
			<p class="text-sm font-medium text-blue-400">Total Players</p>
			<p class="text-2xl font-bold text-white">{userCount}</p>
		</div>
		<div class="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow">
			<p class="text-sm font-medium text-green-400">Scoring Rules</p>
			<p class="text-base text-white">Correct Scoreline: <span class="font-bold">3 points</span></p>
			<p class="text-base text-white">Correct Outcome: <span class="font-bold">1 point</span></p>
		</div>
		<div class="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow">
			<p class="text-sm font-medium text-purple-400">Top Score</p>
			<p class="text-2xl font-bold text-white">{topScore} points</p>
		</div>
	</div>

	{#if !leaderboard || leaderboard.length === 0}
		<div class="rounded-md bg-slate-700 p-4 text-center">
			<p class="text-blue-300">No leaderboard data available yet. Make some predictions!</p>
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800 shadow">
			<table class="w-full table-auto border-collapse">
				<thead class="bg-slate-700">
					<tr>
						<th
							scope="col"
							class="border-b border-slate-600 px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-300 uppercase"
						>
							Rank
						</th>
						<th
							scope="col"
							class="border-b border-slate-600 px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-300 uppercase"
						>
							Player
						</th>
						<th
							scope="col"
							class="border-b border-slate-600 px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-300 uppercase"
						>
							Points
						</th>
						<th
							scope="col"
							class="border-b border-slate-600 px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-300 uppercase"
						>
							Correct Scores
						</th>
						<th
							scope="col"
							class="border-b border-slate-600 px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-300 uppercase"
						>
							Correct Outcomes
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-700">
					{#each leaderboard as entry, index}
						<tr class={index === 0 ? 'bg-yellow-900/30' : index < 3 ? 'bg-slate-700/50' : ''}>
							<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-white">
								{#if index < 3}
									<span
										class="inline-flex h-6 w-6 items-center justify-center rounded-full
										{index === 0
											? 'bg-yellow-600 text-yellow-100'
											: index === 1
												? 'bg-slate-500 text-slate-100'
												: 'bg-amber-800 text-amber-100'}"
									>
										{index + 1}
									</span>
								{:else}
									{index + 1}
								{/if}
							</td>
							<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-white">
								{entry.username || 'Unknown Player'}
							</td>
							<td class="px-6 py-4 text-sm font-bold whitespace-nowrap text-white">
								{entry.totalPoints}
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap text-slate-300">
								{entry.correctScorelines}
								<span class="text-xs text-slate-400">({entry.correctScorelines * 3} pts)</span>
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap text-slate-300">
								{entry.correctOutcomes}
								<span class="text-xs text-slate-400">({entry.correctOutcomes} pts)</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="mt-8 text-center text-slate-400">
			<p class="text-sm">Leaderboard is updated automatically when match results are entered.</p>
			<p class="mt-2 text-sm">
				<span class="font-medium text-slate-300">Correct Scoreline:</span> 3 points |
				<span class="font-medium text-slate-300">Correct Match Outcome:</span> 1 point
			</p>
		</div>
	{/if}
</div>
