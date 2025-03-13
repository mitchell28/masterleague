<script lang="ts">
	import type { Team, Prediction } from '$lib/server/db/schema';
	import type { Fixture as BaseFixture } from '$lib/server/db/schema';

	// Extended Fixture type with canPredict property
	type Fixture = BaseFixture & {
		canPredict?: boolean;
	};

	// Props
	let {
		fixture,
		teams,
		predictions = {},
		predictionValues,
		invalidPredictions = []
	}: {
		fixture: Fixture;
		teams: Record<string, Team>;
		predictions?: Record<string, Prediction>;
		predictionValues: Record<string, { home: number; away: number }>;
		invalidPredictions?: string[];
	} = $props();

	$inspect(fixture);

	// Helper functions
	function formatDate(timestamp: number | Date): string {
		const date = new Date(timestamp);
		return date.toLocaleString('en-GB', {
			weekday: 'short',
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getSpecialBadge(fixture: Fixture): { text: string; color: string } | null {
		if (fixture.pointsMultiplier > 1) {
			if (fixture.pointsMultiplier === 3) {
				return { text: '3x Points', color: 'bg-green-400' };
			} else if (fixture.pointsMultiplier === 2) {
				return { text: '2x Points', color: 'bg-red-400' };
			} else {
				return { text: `${fixture.pointsMultiplier}x Points`, color: 'bg-blue-400' };
			}
		}
		return null;
	}

	function isPredictionComplete(fixtureId: string): boolean {
		return (
			predictionValues[fixtureId]?.home !== undefined &&
			predictionValues[fixtureId]?.away !== undefined
		);
	}

	function canPredictFixture(fixture: Fixture): boolean {
		// URGENT FIX: Allow all scheduled fixtures to be predicted regardless of date
		// The date parsing was causing issues with different locales/formats

		// First check if it's a scheduled match - this should ALWAYS be predictable
		if (fixture.status === 'upcoming') {
			return true;
		}

		// Check server's calculation as fallback
		if (fixture.canPredict === true) {
			return true;
		}

		// If neither of the above conditions are met, it's not predictable
		return false;
	}
</script>

<div
	class="rounded-xl border border-slate-700 bg-slate-800/30 p-4 shadow-md transition-all hover:shadow-lg"
	class:border-red-500={invalidPredictions.includes(fixture.id)}
>
	<div class="mb-2 flex items-center justify-between">
		<span class="text-sm font-medium text-slate-300">{formatDate(fixture.matchDate)}</span>
		{#if getSpecialBadge(fixture)}
			{@const badge = getSpecialBadge(fixture)}
			<span class="badge rounded-full px-2 py-1 text-xs font-bold {badge?.color}"
				>{badge?.text}</span
			>
		{/if}
	</div>

	<div class="flex items-center">
		<div class="flex flex-1 items-center gap-2">
			{#if teams[fixture.homeTeamId]?.logo}
				<img
					src={teams[fixture.homeTeamId].logo}
					alt={teams[fixture.homeTeamId]?.name || fixture.homeTeamId}
					class="h-8 w-8 object-contain"
				/>
			{/if}
			<span class="font-semibold">{teams[fixture.homeTeamId]?.name || 'Unknown Team'}</span>
		</div>

		<div class="mx-4 text-center font-bold">vs</div>

		<div class="flex flex-1 items-center justify-end gap-2">
			<span class="font-semibold">{teams[fixture.awayTeamId]?.name || 'Unknown Team'}</span>
			{#if teams[fixture.awayTeamId]?.logo}
				<img
					src={teams[fixture.awayTeamId].logo}
					alt={teams[fixture.awayTeamId]?.name || fixture.awayTeamId}
					class="h-8 w-8 object-contain"
				/>
			{/if}
		</div>
	</div>

	<div class="mt-4">
		{#if canPredictFixture(fixture)}
			<div class="flex items-center justify-center gap-4">
				<div class="flex flex-col items-center">
					<label for="home-{fixture.id}" class="mb-1 text-sm text-slate-300">
						{teams[fixture.homeTeamId]?.shortName || 'Home'}
					</label>
					<input
						id="home-{fixture.id}"
						name="prediction-{fixture.id}-home"
						type="number"
						min="0"
						class="w-16 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-center text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
						class:border-red-500={invalidPredictions.includes(fixture.id)}
						value={predictionValues[fixture.id]?.home ?? 0}
						oninput={(e) => {
							// Initialize the fixture's prediction if it doesn't exist
							if (!predictionValues[fixture.id]) {
								predictionValues = {
									...predictionValues,
									[fixture.id]: { home: 0, away: 0 }
								};
							}

							// Update the home score directly in the input event
							const updatedValues = { ...predictionValues };
							const target = e.currentTarget as HTMLInputElement;
							updatedValues[fixture.id].home = Math.max(0, Number(target.value) || 0);
							predictionValues = updatedValues;
						}}
					/>
				</div>

				<div class="font-bold">-</div>

				<div class="flex flex-col items-center">
					<label for="away-{fixture.id}" class="mb-1 text-sm text-slate-300">
						{teams[fixture.awayTeamId]?.shortName || 'Away'}
					</label>
					<input
						id="away-{fixture.id}"
						name="prediction-{fixture.id}-away"
						type="number"
						min="0"
						class="w-16 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-center text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
						class:border-red-500={invalidPredictions.includes(fixture.id)}
						value={predictionValues[fixture.id]?.away ?? 0}
						oninput={(e) => {
							// Initialize the fixture's prediction if it doesn't exist
							if (!predictionValues[fixture.id]) {
								predictionValues = {
									...predictionValues,
									[fixture.id]: { home: 0, away: 0 }
								};
							}

							// Update the away score directly in the input event
							const updatedValues = { ...predictionValues };
							const target = e.currentTarget as HTMLInputElement;
							updatedValues[fixture.id].away = Math.max(0, Number(target.value) || 0);
							predictionValues = updatedValues;
						}}
					/>
				</div>
			</div>
			{#if isPredictionComplete(fixture.id)}
				<div class="mt-2 text-center text-sm text-green-400">Prediction set</div>
			{:else}
				<div class="mt-2 text-center text-sm text-yellow-400">Enter your prediction</div>
			{/if}
		{:else if fixture.status === 'in_play' && fixture.homeScore !== undefined && fixture.awayScore !== undefined}
			<div class="text-center">
				<div class="flex items-center justify-center gap-2">
					<span class="animate-pulse rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white"
						>LIVE</span
					>
					<div class="text-xl font-bold">
						{fixture.homeScore} - {fixture.awayScore}
					</div>
				</div>
				<div class="mt-1 text-sm opacity-75">Match in progress</div>
				{#if predictions[fixture.id]}
					<div class="mt-2 text-sm">
						Your prediction: {predictions[fixture.id].predictedHomeScore} - {predictions[fixture.id]
							.predictedAwayScore}
					</div>
				{/if}
			</div>
		{:else if fixture.homeScore !== undefined && fixture.awayScore !== undefined}
			<div class="text-center">
				<div class="text-xl font-bold">
					{fixture.homeScore} - {fixture.awayScore}
				</div>
				<div class="mt-1 text-sm opacity-75">Final Score</div>
				{#if predictions[fixture.id]}
					<div class="mt-2 text-sm">
						Your prediction: {predictions[fixture.id].predictedHomeScore} - {predictions[fixture.id]
							.predictedAwayScore}
						{#if predictions[fixture.id].points !== undefined}
							<div class="mt-1 font-medium">
								Points: <span class="text-green-400">{predictions[fixture.id].points}</span>
							</div>
						{/if}
					</div>
				{:else}
					<div class="mt-2 text-sm text-red-400">No prediction made</div>
				{/if}
			</div>
		{:else}
			<div class="text-center">
				<div class="text-sm opacity-75">
					{#if new Date(fixture.matchDate) < new Date()}
						Result pending
					{:else}
						{new Date(fixture.matchDate) < new Date(new Date().getTime() + 15 * 60 * 1000)
							? 'Match starting soon - prediction window closed'
							: 'Prediction window closed for other reasons'}
					{/if}
				</div>
				{#if predictions[fixture.id]}
					<div class="mt-2 text-sm">
						Your prediction: {predictions[fixture.id].predictedHomeScore} - {predictions[fixture.id]
							.predictedAwayScore}
					</div>
				{:else}
					<div class="mt-2 text-sm text-red-400">No prediction made</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
