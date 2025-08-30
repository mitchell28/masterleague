<script lang="ts">
	import { RefreshCcw } from '@lucide/svelte';

	// Define the data structure
	let { data } = $props<{
		data: {
			leaderboardUser: {
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
				predictions: Array<{
					fixture: {
						id: string;
						status: string;
						matchDate: string;
						homeScore: number | null;
						awayScore: number | null;
						pointsMultiplier: number;
					};
					prediction: {
						id: string;
						predictedHomeScore: number;
						predictedAwayScore: number;
						totalPoints: number | null;
						updatedAt: string;
					} | null;
					homeTeam: {
						id: string;
						name: string;
						shortName: string;
						logo: string | null;
					};
					originalPrediction?: {
						id: string;
						predictedHomeScore: number;
						predictedAwayScore: number;
						totalPoints: number | null;
						updatedAt: string;
					} | null;
					isHidden?: boolean;
				}>;
			};
			availableWeeks: number[];
			awayTeams: Record<
				string,
				{
					id: string;
					name: string;
					shortName: string;
					logo: string | null;
				}
			>;
			isViewingOwnProfile: boolean;
			currentUserId: string;
		};
	}>();

	// Helper function to get result class - more precise status handling
	function getResultClass(
		points: number | null,
		status: string,
		multiplier: number,
		hasPrediction: boolean
	) {
		// No prediction case - use a different style
		if (!hasPrediction && status === 'FINISHED') return 'bg-gray-800 text-gray-300';

		// Live match styling
		if (['IN_PLAY', 'PAUSED'].includes(status)) return 'bg-yellow-900 text-yellow-200';

		// Special status styling
		if (['POSTPONED', 'CANCELLED', 'SUSPENDED'].includes(status))
			return 'bg-gray-800 text-gray-300';

		// Not finished yet
		if (status !== 'FINISHED') return 'bg-slate-700';

		// Finished but not processed yet
		if (points === null || points === undefined) return 'bg-indigo-900 text-indigo-200';

		// Finished and processed
		if (points === 0) return 'bg-red-950 text-red-300';

		// Calculate base points for multiplier matches
		if (points !== null) {
			const basePoints = points / multiplier;
			if (basePoints === 3) return 'bg-green-950 text-green-300';
			if (basePoints === 1) return 'bg-blue-950 text-blue-300';
		}

		return 'bg-slate-700 text-slate-300';
	}

	// Helper function to get result text
	function getResultText(
		points: number | null,
		status: string,
		multiplier: number,
		hasPrediction: boolean,
		isHidden: boolean = false
	) {
		// Hidden prediction case
		if (isHidden) return 'Prediction Hidden';

		// No prediction case
		if (!hasPrediction && status === 'FINISHED') return 'No Prediction';

		// Check for completed fixtures more accurately
		if (status === 'FINISHED') {
			if (points === null || points === undefined) return 'Processing';
			if (points === 0) return 'Incorrect';

			const basePoints = points / multiplier;
			if (basePoints === 3) return 'Exact Score';
			if (basePoints === 1) return 'Correct Outcome';
			return 'Scored';
		}

		// More descriptive pending states
		if (['IN_PLAY', 'PAUSED'].includes(status)) return 'Live';
		if (['POSTPONED', 'CANCELLED', 'SUSPENDED'].includes(status)) return status;

		return 'Pending';
	}

	// Format date and time for match display
	function formatMatchDateTime(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleString('en-US', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Format date function - without time to match predictions page
	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
	}

	// Compute if there are any predictions being processed
	const hasProcessingPredictions = data.weekData.predictions.some(
		(p: { fixture: { status: string }; prediction?: { totalPoints: number | null } }) =>
			p.fixture.status === 'FINISHED' &&
			p.prediction &&
			(p.prediction.totalPoints === null || p.prediction.totalPoints === undefined)
	);
</script>

<!-- Processing message -->
{#if hasProcessingPredictions}
	<div class="mb-6 border-l-4 border-l-blue-500 bg-slate-900 p-4 sm:p-6">
		<div class="flex items-center gap-3">
			<RefreshCcw class="h-4 w-4 animate-spin text-blue-400 sm:h-5 sm:w-5" />
			<div>
				<p class="font-medium text-white">Points are being calculated</p>
				<p class="text-sm text-blue-300">Refresh in a moment to see updated results.</p>
			</div>
		</div>
	</div>
{/if}

<!-- Predictions Table -->
{#if data.weekData.predictions.length > 0}
	<div class="overflow-hidden border-b-4 border-b-slate-600 bg-slate-900">
		<!-- Mobile Card View (visible on small screens) -->
		<div class="block sm:hidden">
			{#each data.weekData.predictions as { prediction, fixture, homeTeam, originalPrediction, isHidden }}
				<div
					class="border-b border-slate-700/50 p-5 transition-all duration-200 last:border-b-0 hover:border-slate-600/50 hover:bg-slate-800/50"
				>
					<!-- Match Header with enhanced styling -->
					<div class="mb-4 flex items-center justify-between">
						<div class="flex w-full items-center justify-between">
							<div class="flex items-center gap-2 text-sm font-medium text-white">
								<div class="flex items-center gap-1">
									{#if homeTeam.logo}
										<img
											src={homeTeam.logo}
											alt="{homeTeam.name} logo"
											class="h-4 w-4 rounded-sm"
										/>
									{/if}
									<span class="text-indigo-200">{homeTeam.shortName}</span>
								</div>
								<span class="text-slate-400">vs</span>
								<div class="flex items-center gap-1">
									{#if data.awayTeams[fixture.id]?.logo}
										<img
											src={data.awayTeams[fixture.id].logo}
											alt="{data.awayTeams[fixture.id].name} logo"
											class="h-4 w-4 rounded-sm"
										/>
									{/if}
									<span class="text-purple-200"
										>{data.awayTeams[fixture.id]?.shortName || '???'}</span
									>
								</div>
								{#if fixture.pointsMultiplier === 2}
									<span
										class="inline-flex items-center rounded-full bg-indigo-600 px-2 py-1 text-xs font-bold"
									>
										{fixture.pointsMultiplier}× Points
									</span>
								{:else if fixture.pointsMultiplier === 3}
									<span
										class="inline-flex items-center rounded-full bg-yellow-600 px-2 py-1 text-xs font-bold"
									>
										{fixture.pointsMultiplier}× Points
									</span>
								{/if}
							</div>

							<div class="mt-1 flex items-center gap-2 text-xs text-slate-400">
								<span>{formatDate(fixture.matchDate)}</span>
							</div>
						</div>
					</div>

					<!-- Prediction vs Result -->
					<div class="mb-3 grid grid-cols-2 gap-4">
						<div class="text-center">
							<div class="mb-1 text-xs tracking-wide text-slate-400 uppercase">Prediction</div>
							<div class="text-sm font-bold text-white">
								{#if isHidden}
									<div class="text-slate-500">
										<div class="text-xs">Prediction Hidden</div>
										<div class="text-xs text-slate-400">
											{formatMatchDateTime(fixture.matchDate)}
										</div>
									</div>
								{:else if prediction}
									{prediction.predictedHomeScore}-{prediction.predictedAwayScore}
								{:else}
									<span class="text-slate-500">No prediction</span>
								{/if}
							</div>
						</div>
						<div class="text-center">
							<div class="mb-1 text-xs tracking-wide text-slate-400 uppercase">Result</div>
							<div class="text-sm text-slate-300">
								{fixture.homeScore !== null && fixture.awayScore !== null
									? `${fixture.homeScore}-${fixture.awayScore}`
									: 'TBD'}
							</div>
						</div>
					</div>

					<!-- Status and Points -->
					<div class="flex items-center justify-between">
						<span
							class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {getResultClass(
								prediction?.totalPoints ?? null,
								fixture.status,
								fixture.pointsMultiplier,
								prediction !== null || isHidden
							)}"
						>
							{getResultText(
								prediction?.totalPoints ?? null,
								fixture.status,
								fixture.pointsMultiplier,
								prediction !== null || isHidden,
								isHidden
							)}
						</span>
						<div class="text-right">
							<div class="text-xs tracking-wide text-slate-400 uppercase">Points</div>
							<div class="text-sm font-bold">
								{#if isHidden}
									<span class="text-slate-500">-</span>
								{:else if prediction}
									{#if prediction.totalPoints !== null && prediction.totalPoints !== undefined}
										<span class={prediction.totalPoints > 0 ? 'text-green-400' : 'text-red-400'}>
											{prediction.totalPoints}
										</span>
									{:else if fixture.status === 'FINISHED'}
										<RefreshCcw class="mx-auto h-4 w-4 animate-spin text-blue-400" />
									{:else}
										<span class="text-slate-500">-</span>
									{/if}
								{:else}
									<span class="text-slate-500">-</span>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Desktop Table View (hidden on small screens) -->
		<div class="hidden overflow-x-auto sm:block">
			<table class="min-w-full bg-slate-800/30 backdrop-blur-sm">
				<thead class="bg-gradient-to-r from-slate-900/80 to-slate-800/80">
					<tr class="border-b border-slate-700/70">
						<th
							class="px-6 py-4 text-left text-xs font-medium tracking-wider text-slate-300 uppercase"
						>
							Match
						</th>
						<th
							class="px-3 py-4 text-center text-xs font-medium tracking-wider text-slate-300 uppercase"
						>
							Date
						</th>
						<th
							class="px-3 py-4 text-center text-xs font-medium tracking-wider text-slate-300 uppercase"
						>
							Prediction
						</th>
						<th
							class="px-3 py-4 text-center text-xs font-medium tracking-wider text-slate-300 uppercase"
						>
							Result
						</th>
						<th
							class="px-3 py-4 text-center text-xs font-medium tracking-wider text-slate-300 uppercase"
						>
							Status
						</th>
						<th
							class="px-3 py-4 text-center text-xs font-medium tracking-wider text-slate-300 uppercase"
						>
							Points
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-700">
					{#each data.weekData.predictions as { prediction, fixture, homeTeam, isHidden }}
						<tr
							class="border-b border-slate-700/50 transition-all duration-200 hover:bg-slate-700/30 hover:shadow-lg"
						>
							<td class="px-6 py-4 text-sm font-medium text-white">
								<div class="flex items-center gap-3">
									<div class="flex items-center gap-2">
										<div class="flex items-center gap-1">
											{#if homeTeam.logo}
												<img
													src={homeTeam.logo}
													alt="{homeTeam.name} logo"
													class="h-5 w-5 rounded-sm"
												/>
											{/if}
											<span class="font-medium">{homeTeam.shortName}</span>
										</div>
										<span class="text-slate-400">vs</span>
										<div class="flex items-center gap-1">
											{#if data.awayTeams[fixture.id]?.logo}
												<img
													loading="lazy"
													src={data.awayTeams[fixture.id].logo}
													alt="{data.awayTeams[fixture.id].name} logo"
													class="h-5 w-5 rounded-sm"
												/>
											{/if}
											<span class="font-medium"
												>{data.awayTeams[fixture.id]?.shortName || '???'}</span
											>
										</div>
									</div>
									{#if fixture.pointsMultiplier === 2}
										<span
											class="inline-flex items-center rounded-full bg-indigo-800 px-2 py-1 text-xs font-bold"
										>
											{fixture.pointsMultiplier}× Points
										</span>
									{:else if fixture.pointsMultiplier === 3}
										<span
											class="inline-flex items-center rounded-full bg-yellow-600 px-2 py-1 text-xs font-bold"
										>
											{fixture.pointsMultiplier}× Points
										</span>
									{/if}
								</div>
							</td>
							<td class="px-3 py-4 text-center text-sm text-slate-300">
								{formatDate(fixture.matchDate)}
							</td>
							<td class="px-3 py-4 text-center text-sm font-bold text-white">
								{#if isHidden}
									<span class="text-slate-400">Prediction Hidden</span>
								{:else if prediction}
									{prediction.predictedHomeScore}-{prediction.predictedAwayScore}
								{:else}
									<span class="text-slate-500">No prediction</span>
								{/if}
							</td>
							<td class="px-3 py-4 text-center text-sm text-slate-300">
								{fixture.homeScore !== null && fixture.awayScore !== null
									? `${fixture.homeScore}-${fixture.awayScore}`
									: 'TBD'}
							</td>
							<td class="px-3 py-4 text-center text-sm">
								<span
									class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {getResultClass(
										prediction?.totalPoints ?? null,
										fixture.status,
										fixture.pointsMultiplier,
										prediction !== null || isHidden
									)}"
								>
									{getResultText(
										prediction?.totalPoints ?? null,
										fixture.status,
										fixture.pointsMultiplier,
										prediction !== null || isHidden,
										isHidden
									)}
								</span>
							</td>
							<td class="px-3 py-4 text-center text-sm font-bold">
								{#if isHidden}
									<span class="text-slate-500">-</span>
								{:else if prediction}
									{#if prediction.totalPoints !== null && prediction.totalPoints !== undefined}
										<span class={prediction.totalPoints > 0 ? 'text-green-400' : 'text-red-400'}>
											{prediction.totalPoints}
										</span>
									{:else if fixture.status === 'FINISHED'}
										<RefreshCcw class="mx-auto h-4 w-4 animate-spin text-blue-400" />
									{:else}
										<span class="text-slate-500">-</span>
									{/if}
								{:else}
									<span class="text-slate-500">-</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{:else}
	<div class="border-b-4 border-b-slate-600 bg-slate-900 p-6 text-center">
		<p class="text-lg text-slate-300">No predictions for this week</p>
	</div>
{/if}
