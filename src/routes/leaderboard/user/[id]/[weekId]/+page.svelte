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
			pointsMultiplier: number;
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
	function getResultClass(points: number | null, status: string, multiplier: number) {
		if (status !== 'FINISHED') return 'bg-slate-700';
		if (points === 0) return 'bg-red-950 text-red-300';

		if (points !== null) {
			// Calculate base points
			const basePoints = points / multiplier;

			// Perfect prediction (3 base points)
			if (basePoints === 3) return 'bg-green-950 text-green-300';

			// Correct outcome (1 base point)
			if (basePoints === 1) return 'bg-blue-950 text-blue-300';
		}

		return 'bg-slate-700 text-slate-300';
	}

	// Helper function to get result text
	function getResultText(points: number | null, status: string, multiplier: number) {
		if (status !== 'FINISHED') return 'Pending';
		if (points === 0) return 'Incorrect';
		if (points === null) return '-';

		// Use the multiplier to determine the base points
		const basePoints = points / multiplier;

		// Perfect prediction is 3 base points
		if (basePoints === 3) return 'Exact';

		// Correct outcome is 1 base point
		if (basePoints === 1) return 'Correct Outcome';

		// Fallback for any other cases
		return points > 0 ? 'Correct' : 'Incorrect';
	}

	// Format date function
	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString(undefined, {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="container mx-auto max-w-6xl p-4">
	<div class="mb-4">
		<h1 class="mb-1 text-3xl font-bold">{data.user.name}'s Predictions</h1>
		<p class="text-slate-300">Week {data.weekData.weekId}</p>
	</div>

	<!-- Stats overview with smaller height for better performance -->
	<div class="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center shadow-md">
			<p class="text-2xl font-bold text-white">{data.stats.totalPoints}</p>
			<p class="text-xs font-medium text-slate-400">Total Points</p>
		</div>
		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center shadow-md">
			<p class="text-2xl font-bold text-green-400">{data.stats.correctScorelines}</p>
			<p class="text-xs font-medium text-slate-400">Perfect Scores</p>
		</div>
		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center shadow-md">
			<p class="text-2xl font-bold text-blue-400">{data.stats.correctOutcomes}</p>
			<p class="text-xs font-medium text-slate-400">Correct Outcomes</p>
		</div>
		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center shadow-md">
			<p class="text-2xl font-bold text-red-400">{data.stats.incorrectPredictions}</p>
			<p class="text-xs font-medium text-slate-400">Incorrect</p>
		</div>
		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center shadow-md">
			<p class="text-2xl font-bold text-purple-400">{data.stats.totalPredictions}</p>
			<p class="text-xs font-medium text-slate-400">Total Predictions</p>
		</div>
		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center shadow-md">
			<p class="text-2xl font-bold text-yellow-400">
				{data.stats.completedPredictions
					? Math.round(
							((data.stats.correctScorelines + data.stats.correctOutcomes) /
								data.stats.completedPredictions) *
								100
						)
					: 0}%
			</p>
			<p class="text-xs font-medium text-slate-400">Success Rate</p>
		</div>
	</div>

	<!-- Weekly predictions table -->
	{#if data.weekData.predictions.length > 0}
		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4 shadow-md">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-700">
					<thead>
						<tr>
							<th
								class="px-3 py-2 text-left text-xs font-medium tracking-wider text-slate-300 uppercase"
							>
								Match
							</th>
							<th
								class="px-3 py-2 text-center text-xs font-medium tracking-wider text-slate-300 uppercase"
							>
								Date
							</th>
							<th
								class="px-3 py-2 text-center text-xs font-medium tracking-wider text-slate-300 uppercase"
							>
								Prediction
							</th>
							<th
								class="px-3 py-2 text-center text-xs font-medium tracking-wider text-slate-300 uppercase"
							>
								Result
							</th>
							<th
								class="px-3 py-2 text-center text-xs font-medium tracking-wider text-slate-300 uppercase"
							>
								Multiplier
							</th>
							<th
								class="px-3 py-2 text-center text-xs font-medium tracking-wider text-slate-300 uppercase"
							>
								Status
							</th>
							<th
								class="px-3 py-2 text-center text-xs font-medium tracking-wider text-slate-300 uppercase"
							>
								Points
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-700">
						{#each data.weekData.predictions as { prediction, fixture, homeTeam }}
							<tr class="transition-colors hover:bg-slate-700/30">
								<td class="px-3 py-2 text-sm font-medium text-white">
									{homeTeam.shortName} vs {data.awayTeams[fixture.id]?.shortName || '???'}
								</td>
								<td class="px-3 py-2 text-center text-sm text-slate-300">
									{formatDate(fixture.matchDate)}
								</td>
								<td class="px-3 py-2 text-center text-sm font-bold text-white">
									{prediction.predictedHomeScore}-{prediction.predictedAwayScore}
								</td>
								<td class="px-3 py-2 text-center text-sm text-slate-300">
									{fixture.homeScore !== null && fixture.awayScore !== null
										? `${fixture.homeScore}-${fixture.awayScore}`
										: 'TBD'}
								</td>
								<td class="px-3 py-2 text-center text-sm font-bold">
									{#if fixture.pointsMultiplier > 1}
										<span
											class="rounded-full bg-yellow-700 px-2 py-1 text-xs font-bold text-yellow-200"
										>
											{fixture.pointsMultiplier}×
										</span>
									{:else}
										<span class="text-slate-400">1×</span>
									{/if}
								</td>
								<td class="px-3 py-2 text-center text-sm">
									<span
										class={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getResultClass(
											prediction.points,
											fixture.status,
											fixture.pointsMultiplier
										)}`}
									>
										{getResultText(prediction.points, fixture.status, fixture.pointsMultiplier)}
									</span>
								</td>
								<td class="px-3 py-2 text-center text-sm font-bold text-white">
									{prediction.points ?? '-'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-6 text-center">
			<p class="text-lg text-slate-300">No predictions for this week</p>
		</div>
	{/if}
</div>
