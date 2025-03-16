<script lang="ts">
	type Prediction = {
		prediction: {
			id: string;
			predictedHomeScore: number;
			predictedAwayScore: number;
			points: number | null;
		};
		fixture: {
			id: string;
			weekId: number;
			homeScore: number | null;
			awayScore: number | null;
			matchDate: string;
			status: string;
		};
		homeTeam: {
			id: string;
			name: string;
			shortName: string;
		};
	};

	// Define the data structure
	let { data } = $props<{
		data: {
			user: {
				id: string;
				name: string;
				email: string;
			};
			stats: {
				totalPredictions: number;
				completedPredictions: number;
				totalPoints: number;
				correctScorelines: number;
				correctOutcomes: number;
				incorrectPredictions: number;
			};
			weekData: {
				weekId: number;
				predictions: Prediction[];
			};
			availableWeeks: number[];
			awayTeams: Record<
				string,
				{
					id: string;
					name: string;
					shortName: string;
				}
			>;
		};
	}>();

	// Helper function to get result class
	function getResultClass(points: number | null, status: string) {
		if (status !== 'completed') return 'bg-slate-700';
		if (points === 3) return 'bg-green-950 text-green-300';
		if (points === 1) return 'bg-blue-950 text-blue-300';
		return 'bg-red-950 text-red-300';
	}

	// Helper function to get result text
	function getResultText(points: number | null, status: string) {
		if (status !== 'completed') return 'Pending';
		if (points === 3) return 'Exact Score';
		if (points === 1) return 'Correct Outcome';
		return 'Incorrect';
	}
</script>

<div>
	<!-- Stats Cards -->
	<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
		<div class="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow">
			<p class="text-sm font-medium text-blue-400">Total Points</p>
			<p class="text-2xl font-bold text-white">{data.stats.totalPoints}</p>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow">
			<p class="text-sm font-medium text-green-400">Correct Scores</p>
			<p class="text-2xl font-bold text-white">{data.stats.correctScorelines}</p>
			<p class="text-xs text-slate-400">({data.stats.correctScorelines * 3} pts)</p>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow">
			<p class="text-sm font-medium text-blue-400">Correct Outcomes</p>
			<p class="text-2xl font-bold text-white">{data.stats.correctOutcomes}</p>
			<p class="text-xs text-slate-400">({data.stats.correctOutcomes} pts)</p>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow">
			<p class="text-sm font-medium text-red-400">Incorrect</p>
			<p class="text-2xl font-bold text-white">{data.stats.incorrectPredictions}</p>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow">
			<p class="text-sm font-medium text-purple-400">Predictions</p>
			<p class="text-2xl font-bold text-white">{data.stats.totalPredictions}</p>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow">
			<p class="text-sm font-medium text-yellow-400">Success Rate</p>
			<p class="text-2xl font-bold text-white">
				{data.stats.completedPredictions
					? Math.round(
							((data.stats.correctScorelines + data.stats.correctOutcomes) /
								data.stats.completedPredictions) *
								100
						)
					: 0}%
			</p>
		</div>
	</div>

	<!-- Predictions for Current Week -->
	{#if !data.weekData.predictions || data.weekData.predictions.length === 0}
		<div class="rounded-lg border border-slate-700 bg-slate-800 p-6 text-center shadow">
			<p class="text-xl text-slate-300">No prediction data available for this week</p>
		</div>
	{:else}
		<div class="mb-6 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow">
			<div class="overflow-x-auto">
				<table class="w-full table-auto">
					<thead class="bg-slate-700/50">
						<tr>
							<th class="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase">Match</th
							>
							<th class="px-4 py-2 text-center text-xs font-medium text-slate-300 uppercase"
								>Date</th
							>
							<th class="px-4 py-2 text-center text-xs font-medium text-slate-300 uppercase"
								>Prediction</th
							>
							<th class="px-4 py-2 text-center text-xs font-medium text-slate-300 uppercase"
								>Actual</th
							>
							<th class="px-4 py-2 text-center text-xs font-medium text-slate-300 uppercase"
								>Result</th
							>
							<th class="px-4 py-2 text-center text-xs font-medium text-slate-300 uppercase"
								>Points</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-700">
						{#each data.weekData.predictions as { prediction, fixture, homeTeam }}
							<tr>
								<td class="px-4 py-3 text-sm font-medium text-white">
									{homeTeam.shortName} vs {data.awayTeams[fixture.id]?.shortName || '???'}
								</td>
								<td class="px-4 py-3 text-center text-sm text-slate-300">
									{new Date(fixture.matchDate).toLocaleDateString()}
								</td>
								<td class="px-4 py-3 text-center text-sm font-bold text-white">
									{prediction.predictedHomeScore}-{prediction.predictedAwayScore}
								</td>
								<td class="px-4 py-3 text-center text-sm text-slate-300">
									{fixture.homeScore !== null && fixture.awayScore !== null
										? `${fixture.homeScore}-${fixture.awayScore}`
										: 'TBD'}
								</td>
								<td class="px-4 py-3 text-center text-sm">
									<span
										class={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getResultClass(
											prediction.points,
											fixture.status
										)}`}
									>
										{getResultText(prediction.points, fixture.status)}
									</span>
								</td>
								<td class="px-4 py-3 text-center text-sm font-bold text-white">
									{prediction.points ?? '-'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
