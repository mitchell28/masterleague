<script lang="ts">
	import type { Prediction } from '$lib/server/db';
	import {
		RefreshCw,
		Clock,
		Calendar,
		Award,
		CheckCircle2,
		XCircle,
		AlertTriangle,
		BarChart4,
		TrendingUp,
		Medal,
		Target,
		ThumbsUp,
		Star
	} from '@lucide/svelte';

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
					};
				}>;
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

		// Finished but not processed yet - changed from purple to indigo for better UX
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

	// Helper function to get result text - better user messaging
	function getResultText(
		points: number | null,
		status: string,
		multiplier: number,
		hasPrediction: boolean
	) {
		// No prediction case
		if (!hasPrediction && status === 'FINISHED') return 'No Prediction';

		// Check for completed fixtures more accurately
		if (status === 'FINISHED') {
			if (points === null || points === undefined) return 'Processing'; // Check for both null and undefined
			if (points === 0) return 'Incorrect';

			const basePoints = points / multiplier;
			if (basePoints === 3) return 'Exact Score';
			if (basePoints === 1) return 'Correct Outcome';
			return 'Scored'; // Generic fallback
		}

		// More descriptive pending states
		if (['IN_PLAY', 'PAUSED'].includes(status)) return 'Live';
		if (['POSTPONED', 'CANCELLED', 'SUSPENDED'].includes(status)) return status;

		return 'Pending';
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

	// Format timestamp for predictions
	function formatTimestamp(dateString?: string) {
		if (!dateString) return '';

		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		// If less than a day ago, show relative time
		if (diffDays < 1) {
			const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
			if (diffHours < 1) {
				const diffMinutes = Math.floor(diffMs / (1000 * 60));
				return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
			}
			return `${diffHours}h ago`;
		}

		// Otherwise show formatted date
		return date.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Page refresh handler
	function refreshPage() {
		window.location.reload();
	}

	// Compute if there are any predictions being processed - exclude fixtures with no prediction
	const hasProcessingPredictions = data.weekData.predictions.some(
		(p: { fixture: { status: string }; prediction?: { totalPoints: number | null } }) =>
			p.fixture.status === 'FINISHED' &&
			p.prediction && // Only count fixtures that have a prediction
			(p.prediction.totalPoints === null || p.prediction.totalPoints === undefined)
	);
</script>

<div class="container mx-auto max-w-6xl p-4">
	<!-- Header with last updated info -->
	<div class="mb-4">
		<div class="flex items-center justify-between">
			<h1
				class="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-3xl font-bold text-white"
			>
				{data.user.name}'s Predictions
			</h1>
			<div class="flex items-center gap-2 text-sm text-slate-400">
				<Clock class="h-4 w-4" />
				<span>Last updated: {new Date().toLocaleString()}</span>
			</div>
		</div>
	</div>

	<!-- Stats overview with Lucide icons -->
	<div class="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center shadow-md">
			<div class="mb-1 flex justify-center">
				<BarChart4 class="h-5 w-5 text-white" />
			</div>
			<p class="text-2xl font-bold text-white">{data.stats.totalPoints}</p>
			<p class="text-xs font-medium text-slate-400">Total Points</p>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center shadow-md">
			<div class="mb-1 flex justify-center">
				<Medal class="h-5 w-5 text-green-400" />
			</div>
			<p class="text-2xl font-bold text-green-400">{data.stats.correctScorelines}</p>
			<p class="text-xs font-medium text-slate-400">Perfect Scores</p>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center shadow-md">
			<div class="mb-1 flex justify-center">
				<Target class="h-5 w-5 text-blue-400" />
			</div>
			<p class="text-2xl font-bold text-blue-400">{data.stats.correctOutcomes}</p>
			<p class="text-xs font-medium text-slate-400">Correct Outcomes</p>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center shadow-md">
			<div class="mb-1 flex justify-center">
				<XCircle class="h-5 w-5 text-red-400" />
			</div>
			<p class="text-2xl font-bold text-red-400">{data.stats.incorrectPredictions}</p>
			<p class="text-xs font-medium text-slate-400">Incorrect</p>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center shadow-md">
			<div class="mb-1 flex justify-center">
				<Award class="h-5 w-5 text-purple-400" />
			</div>
			<p class="text-2xl font-bold text-purple-400">{data.stats.totalPredictions}</p>
			<p class="text-xs font-medium text-slate-400">Total Predictions</p>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center shadow-md">
			<div class="mb-1 flex justify-center">
				<TrendingUp class="h-5 w-5 text-yellow-400" />
			</div>
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

	<!-- Refresh button and processing indicator -->
	<div class="mt-2 mb-4 text-right">
		<button
			onclick={refreshPage}
			class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
		>
			<RefreshCw class="mr-1.5 h-4 w-4" />
			Refresh Data
		</button>
		{#if hasProcessingPredictions}
			<span class="ml-3 inline-flex items-center text-xs text-indigo-400">
				<svg
					class="mr-1 h-4 w-4 animate-spin"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Points are being calculated. Refresh in a moment to see updated results.
			</span>
		{/if}
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
									<div>
										{homeTeam.shortName} vs {data.awayTeams[fixture.id]?.shortName || '???'}
										{#if prediction && prediction.updatedAt}
											<div class="mt-1 flex items-center gap-1 text-xs text-slate-400">
												<Clock class="h-3 w-3" />
												<span>Updated: {formatTimestamp(prediction.updatedAt)}</span>
											</div>
										{/if}
									</div>
								</td>
								<td class="px-3 py-2 text-center text-sm text-slate-300">
									{formatDate(fixture.matchDate)}
								</td>
								<td class="px-3 py-2 text-center text-sm font-bold text-white">
									{#if prediction}
										<div class="flex items-center justify-center gap-1">
											{prediction.predictedHomeScore}-{prediction.predictedAwayScore}
										</div>
									{:else}
										<span class="text-slate-500">No prediction</span>
									{/if}
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
											<Star class="mr-0.5 inline-block h-3 w-3" />
											{fixture.pointsMultiplier}×
										</span>
									{:else}
										<span class="text-slate-400">1×</span>
									{/if}
								</td>
								<td class="px-3 py-2 text-center text-sm">
									<span
										class={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getResultClass(
											prediction?.totalPoints ?? null,
											fixture.status,
											fixture.pointsMultiplier,
											prediction !== null // Pass whether there is a prediction
										)}`}
									>
										{#if ['IN_PLAY', 'PAUSED'].includes(fixture.status)}
											<AlertTriangle class="mr-0.5 inline-block h-3 w-3" />
										{:else if fixture.status === 'FINISHED' && !prediction}
											<!-- No prediction case -->
											<XCircle class="mr-0.5 inline-block h-3 w-3" />
										{:else if fixture.status === 'FINISHED' && prediction?.totalPoints !== null && prediction?.totalPoints !== undefined}
											{#if prediction?.totalPoints > 0}
												<CheckCircle2 class="mr-0.5 inline-block h-3 w-3" />
											{:else}
												<XCircle class="mr-0.5 inline-block h-3 w-3" />
											{/if}
										{:else if fixture.status === 'FINISHED' && prediction && (prediction?.totalPoints === null || prediction?.totalPoints === undefined)}
											<RefreshCw class="mr-0.5 inline-block h-3 w-3 animate-spin" />
										{/if}
										{getResultText(
											prediction?.totalPoints ?? null,
											fixture.status,
											fixture.pointsMultiplier,
											prediction !== null // Pass whether there is a prediction
										)}
									</span>
								</td>
								<td class="px-3 py-2 text-center text-sm font-bold text-white">
									{#if prediction}
										{#if prediction.totalPoints !== null && prediction.totalPoints !== undefined}
											<div class="flex items-center justify-center">
												{#if prediction.totalPoints > 0}
													<ThumbsUp class="mr-1 h-3.5 w-3.5 text-green-400" />
												{/if}
												<span
													class={prediction.totalPoints > 0 ? 'text-green-400' : 'text-red-400'}
												>
													{prediction.totalPoints}
												</span>
											</div>
										{:else if fixture.status === 'FINISHED'}
											<span class="inline-flex items-center gap-1">
												<span
													class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400"
												></span>
												<span
													class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400"
													style="animation-delay: 0.2s"
												></span>
												<span
													class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400"
													style="animation-delay: 0.4s"
												></span>
											</span>
										{:else}
											-
										{/if}
									{:else}
										<!-- No prediction was made -->
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
		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-6 text-center">
			<p class="text-lg text-slate-300">No predictions for this week</p>
		</div>
	{/if}
</div>
