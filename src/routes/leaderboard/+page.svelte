<script lang="ts">
	import { onMount } from 'svelte';

	type LeaderboardEntry = {
		userId: string;
		username: string;
		totalPoints: number;
		correctScorelines: number;
		correctOutcomes: number;
	};

	let leaderboard: LeaderboardEntry[] = [];
	let loading = true;
	let error = '';

	// Load leaderboard data
	async function loadLeaderboard() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/leaderboard');
			const data = await response.json();

			if (data.success) {
				leaderboard = data.leaderboard;
			} else {
				error = data.message || 'Failed to load leaderboard';
			}
		} catch (err) {
			error = 'An error occurred while loading the leaderboard';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	onMount(loadLeaderboard);
</script>

<div class="container mx-auto px-10">
	<h1 class="mb-6 text-3xl font-bold">Master League Table</h1>

	{#if loading}
		<div class="rounded-md bg-blue-100 p-4">
			<p class="text-blue-800">Loading leaderboard...</p>
		</div>
	{:else if error}
		<div class="rounded-md bg-red-100 p-4">
			<p class="text-red-800">{error}</p>
		</div>
	{:else if leaderboard.length === 0}
		<div class="rounded-md bg-yellow-100 p-4">
			<p class="text-yellow-800">No leaderboard data available yet. Make some predictions first!</p>
			<div class="mt-4">
				<a href="/predictions" class="text-blue-600 hover:text-blue-800"> Make Predictions </a>
			</div>
		</div>
	{:else}
		<div class="overflow-hidden rounded-lg bg-white shadow-md">
			<table class="min-w-full divide-y divide-gray-200">
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
