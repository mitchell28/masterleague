<script lang="ts">
	type LeaderboardEntry = {
		userId: string;
		username: string;
		totalPoints: number;
		correctScorelines: number;
		correctOutcomes: number;
	};

	// Get data from props
	let { data } = $props();
	let leaderboard = $derived(data.leaderboard || []);
</script>

<div class="container mx-auto px-10">
	<h1 class="mb-6 text-3xl font-bold">Master League Table</h1>

	{#if !leaderboard || leaderboard.length === 0}
		<div class="rounded-md bg-blue-100 p-4">
			<p class="text-blue-800">No leaderboard data available.</p>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full table-auto border-collapse">
				<thead class="bg-gray-50">
					<tr>
						<th
							scope="col"
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							Rank
						</th>
						<th
							scope="col"
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							Player
						</th>
						<th
							scope="col"
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							Points
						</th>
						<th
							scope="col"
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							Correct Scores
						</th>
						<th
							scope="col"
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							Correct Outcomes
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each leaderboard as entry, index}
						<tr class={index === 0 ? 'bg-yellow-50' : ''}>
							<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
								{index + 1}
							</td>
							<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
								{entry.username}
							</td>
							<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
								{entry.totalPoints}
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
								{entry.correctScorelines}
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
								{entry.correctOutcomes}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="mt-8 text-center text-gray-600">
			<p>Leaderboard is updated automatically when match results are entered.</p>
		</div>
	{/if}
</div>
