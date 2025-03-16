<script lang="ts">
	import type { Team, Prediction } from '$lib/server/db/schema';
	import type { Fixture as BaseFixture } from '$lib/server/db/schema';

	// Extended Fixture type with canPredict property
	type Fixture = BaseFixture & {
		canPredict?: boolean;
	};

	// Use runes for props with onUpdate callback instead of event dispatcher
	let {
		fixture,
		homeTeam,
		awayTeam,
		prediction,
		isInvalid = false,
		onUpdate = (home: number, away: number) => {},
		readOnly = false,
		isPastWeek = false
	} = $props<{
		fixture: Fixture;
		homeTeam: Team;
		awayTeam: Team;
		prediction?: { home: number; away: number } | null;
		isInvalid?: boolean;
		onUpdate?: (home: number, away: number) => void;
		readOnly?: boolean;
		isPastWeek?: boolean;
	}>();

	// Initialize state
	let homeScore = $state(prediction?.home ?? 0);
	let awayScore = $state(prediction?.away ?? 0);
	let shouldUpdateParent = $state(false);

	// Update state when prediction changes
	$effect(() => {
		if (prediction) {
			// Temporarily disable parent updates while we sync from props
			shouldUpdateParent = false;
			homeScore = prediction.home;
			awayScore = prediction.away;
			// Re-enable parent updates after a small delay
			setTimeout(() => {
				shouldUpdateParent = true;
			}, 0);
		}
	});

	// Effect to track changes and call the update callback
	$effect(() => {
		// Only notify parent when we're allowed to update and not in read-only mode
		if (shouldUpdateParent && !readOnly && prediction !== null) {
			onUpdate(homeScore, awayScore);
		}
	});

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
				return { text: '3x Points', color: 'bg-green-800' };
			} else if (fixture.pointsMultiplier === 2) {
				return { text: '2x Points', color: 'bg-red-800' };
			} else {
				return { text: `${fixture.pointsMultiplier}x Points`, color: 'bg-blue-400' };
			}
		}
		return null;
	}

	// Increment/decrement functions
	function incrementHome() {
		homeScore = Math.min(20, homeScore + 1);
	}

	function decrementHome() {
		homeScore = Math.max(0, homeScore - 1);
	}

	function incrementAway() {
		awayScore = Math.min(20, awayScore + 1);
	}

	function decrementAway() {
		awayScore = Math.max(0, awayScore - 1);
	}
</script>

<div
	class={`rounded-lg border ${isInvalid ? 'border-red-500' : 'border-slate-700'} overflow-hidden bg-slate-800 shadow-md`}
>
	<div class="flex items-center justify-between border-b border-slate-700 bg-slate-900 p-3">
		<div>
			<span
				class={`rounded-full px-2 py-1 text-xs font-medium ${fixture.status === 'upcoming' ? 'bg-blue-900 text-blue-200' : fixture.status === 'live' ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}
			>
				{fixture.status === 'upcoming'
					? 'Upcoming'
					: fixture.status === 'live'
						? 'Live'
						: 'Completed'}
			</span>
			{#if getSpecialBadge(fixture)}
				{@const badge = getSpecialBadge(fixture)}
				<span class={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${badge?.color} text-white`}>
					{badge?.text}
				</span>
			{/if}
		</div>
		<span class="text-sm text-slate-400">{formatDate(fixture.matchDate)}</span>
	</div>

	<div class="flex flex-col gap-3 p-4">
		<div class="flex items-center justify-between gap-2">
			<!-- Home team -->
			<div class="flex items-center gap-2">
				{#if homeTeam.logo}
					<img src={homeTeam.logo} alt={homeTeam.name} class="h-8 w-8 object-contain" />
				{/if}
				<span class="font-medium text-white">{homeTeam.name}</span>
			</div>

			<!-- Away team -->
			<div class="flex items-center gap-2">
				<span class="font-medium text-white">{awayTeam.name}</span>
				{#if awayTeam.logo}
					<img src={awayTeam.logo} alt={awayTeam.name} class="h-8 w-8 object-contain" />
				{/if}
			</div>
		</div>

		<div class="flex items-center justify-center">
			{#if fixture.status === 'completed' && fixture.homeScore !== null && fixture.awayScore !== null}
				<!-- For completed fixtures, show the actual result -->
				<div class="flex flex-col items-center gap-2">
					<div class="flex items-center gap-2">
						<span class="text-lg font-bold text-white">{fixture.homeScore}</span>
						<span class="text-lg text-slate-400">-</span>
						<span class="text-lg font-bold text-white">{fixture.awayScore}</span>
					</div>

					{#if prediction !== undefined && prediction !== null}
						<div class="flex items-center gap-2">
							<span class="text-sm text-slate-400">Your prediction:</span>
							<span class="text-sm text-slate-300">{prediction.home} - {prediction.away}</span>

							{#if isPastWeek && fixture.status === 'completed'}
								<span
									class={`rounded-full px-2 py-0.5 text-xs ${
										prediction.home === fixture.homeScore && prediction.away === fixture.awayScore
											? 'bg-green-500 text-white'
											: (prediction.home > prediction.away &&
														fixture.homeScore > fixture.awayScore) ||
												  (prediction.home < prediction.away &&
														fixture.homeScore < fixture.awayScore) ||
												  (prediction.home === prediction.away &&
														fixture.homeScore === fixture.awayScore)
												? 'bg-yellow-500 text-black'
												: 'bg-red-500 text-white'
									}`}
								>
									{prediction.home === fixture.homeScore && prediction.away === fixture.awayScore
										? 'Perfect'
										: (prediction.home > prediction.away &&
													fixture.homeScore > fixture.awayScore) ||
											  (prediction.home < prediction.away &&
													fixture.homeScore < fixture.awayScore) ||
											  (prediction.home === prediction.away &&
													fixture.homeScore === fixture.awayScore)
											? 'Correct Outcome'
											: 'Incorrect'}
								</span>
							{/if}
						</div>
					{:else}
						<div class="flex items-center gap-2">
							<span class="text-slate-400 italic">No prediction made</span>
							{#if isPastWeek}
								<span class="rounded-full bg-gray-600 px-2 py-0.5 text-xs text-white"
									>No Points</span
								>
							{/if}
						</div>
					{/if}
				</div>
			{:else if fixture.canPredict && !readOnly}
				<!-- For predictable fixtures in current week -->
				<div class="flex items-center gap-2">
					<!-- Home score input -->
					<div class="flex items-center">
						<button
							type="button"
							class="flex h-8 w-8 items-center justify-center rounded-l bg-slate-700 text-white hover:bg-slate-600"
							onclick={decrementHome}
						>
							-
						</button>
						<input
							type="number"
							min="0"
							max="20"
							class="h-8 w-10 border-t border-b border-slate-600 bg-slate-800 text-center text-white"
							bind:value={homeScore}
						/>
						<button
							type="button"
							class="flex h-8 w-8 items-center justify-center rounded-r bg-slate-700 text-white hover:bg-slate-600"
							onclick={incrementHome}
						>
							+
						</button>
					</div>

					<span class="mx-1 text-lg text-slate-400">-</span>

					<!-- Away score input -->
					<div class="flex items-center">
						<button
							type="button"
							class="flex h-8 w-8 items-center justify-center rounded-l bg-slate-700 text-white hover:bg-slate-600"
							onclick={decrementAway}
						>
							-
						</button>
						<input
							type="number"
							min="0"
							max="20"
							class="h-8 w-10 border-t border-b border-slate-600 bg-slate-800 text-center text-white"
							bind:value={awayScore}
						/>
						<button
							type="button"
							class="flex h-8 w-8 items-center justify-center rounded-r bg-slate-700 text-white hover:bg-slate-600"
							onclick={incrementAway}
						>
							+
						</button>
					</div>
				</div>
			{:else if readOnly && prediction}
				<!-- For readonly predictions (past weeks or completed matches) -->
				<div class="flex flex-col items-center gap-1">
					<div class="flex items-center gap-2">
						<span class="text-sm text-slate-400">Your prediction:</span>
						<span class="text-sm font-medium text-slate-300"
							>{prediction.home} - {prediction.away}</span
						>
					</div>

					{#if fixture.status === 'upcoming'}
						<span class="text-xs text-slate-500 italic">Match not played yet</span>
					{/if}
				</div>
			{:else}
				<span class="text-sm text-slate-500 italic">No prediction</span>
			{/if}
		</div>

		{#if isInvalid}
			<div class="mt-2 text-xs text-red-500">Please enter valid scores for this match</div>
		{/if}
	</div>
</div>
