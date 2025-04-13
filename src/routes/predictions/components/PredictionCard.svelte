<script lang="ts">
	import type { Team } from '$lib/server/db/schema';
	import type { Fixture as BaseFixture } from '$lib/server/db/schema';

	// Extended Fixture type with canPredict property
	type Fixture = BaseFixture & {
		canPredict?: boolean;
		isWeekend?: boolean;
		predictionClosesAt?: Date;
		isLive?: boolean;
	};

	// Use runes for props instead of exports
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

	// Memoize some commonly used derived values to avoid recalculations
	let isFixtureCompleted = $derived(fixture.status === 'FINISHED');
	let isFixtureLive = $derived(
		fixture.isLive || fixture.status === 'IN_PLAY' || fixture.status === 'PAUSED'
	);
	let showActualScore = $derived(
		(isFixtureCompleted || isFixtureLive) &&
			fixture.homeScore !== null &&
			fixture.awayScore !== null
	);

	// Initialize state with runes - but only once
	let homeScore = $state(prediction?.home ?? 0);
	let awayScore = $state(prediction?.away ?? 0);

	// Track if we've been initialized to avoid multiple updates
	let initialized = $state(false);

	// Initialize once when the component mounts or prediction changes
	$effect(() => {
		if (!initialized && prediction) {
			homeScore = prediction.home;
			awayScore = prediction.away;
			initialized = true;
		} else if (
			prediction &&
			(homeScore !== prediction.home || awayScore !== prediction.away) &&
			!readOnly
		) {
			// Only update from props if really needed - prevents loops
			homeScore = prediction.home;
			awayScore = prediction.away;
		}
	});

	// Direct handler for score changes - debounce to prevent too many updates
	let updateTimeout: ReturnType<typeof setTimeout> | null = null;
	function handleScoreChange() {
		if (!readOnly && prediction !== null) {
			if (updateTimeout) {
				clearTimeout(updateTimeout);
			}
			updateTimeout = setTimeout(() => {
				onUpdate(homeScore, awayScore);
			}, 300); // Increased debounce to 300ms
		}
	}

	// Memoize formatted date to avoid recalculation
	let formattedMatchDate = $derived(formatDate(fixture.matchDate));

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

	// Get status display info - memoized to avoid recalculation
	let statusDisplay = $derived(getStatusDisplay(fixture.status));
	function getStatusDisplay(status: string): { text: string; classes: string } {
		switch (status) {
			case 'FINISHED':
				return { text: 'Completed', classes: 'bg-green-900 text-green-200' };
			case 'IN_PLAY':
				return { text: 'Live', classes: 'animate-pulse bg-red-900 text-red-200' };
			case 'PAUSED':
				return { text: 'Paused', classes: 'animate-pulse bg-orange-900 text-orange-200' };
			case 'SUSPENDED':
				return { text: 'Suspended', classes: 'bg-yellow-900 text-yellow-200' };
			case 'POSTPONED':
				return { text: 'Postponed', classes: 'bg-purple-900 text-purple-200' };
			case 'CANCELLED':
				return { text: 'Cancelled', classes: 'bg-gray-900 text-gray-200' };
			case 'AWARDED':
				return { text: 'Awarded', classes: 'bg-blue-900 text-blue-200' };
			case 'TIMED':
				return { text: 'Upcoming', classes: 'bg-blue-900 text-blue-200' };
			case 'SCHEDULED':
				return { text: 'Scheduled', classes: 'bg-indigo-900 text-indigo-200' };
			default:
				return { text: status, classes: 'bg-gray-900 text-gray-200' };
		}
	}

	// Get special badge info - memoized
	let specialBadge = $derived(getSpecialBadge(fixture));
	function getSpecialBadge(fixture: Fixture): { text: string; color: string } | null {
		if (fixture.pointsMultiplier > 1) {
			if (fixture.pointsMultiplier === 3) {
				return { text: '3x Points', color: 'bg-gradient-to-r from-amber-500 to-yellow-400' };
			} else if (fixture.pointsMultiplier === 2) {
				return { text: '2x Points', color: 'bg-gradient-to-r from-blue-500 to-indigo-400' };
			} else {
				return { text: `${fixture.pointsMultiplier}x Points`, color: 'bg-amber-400' };
			}
		}
		return null;
	}

	// Increment/decrement functions with update batching logic
	function incrementHome(): void {
		homeScore = Math.min(20, homeScore + 1);
		handleScoreChange();
	}

	function decrementHome(): void {
		homeScore = Math.max(0, homeScore - 1);
		handleScoreChange();
	}

	function incrementAway(): void {
		awayScore = Math.min(20, awayScore + 1);
		handleScoreChange();
	}

	function decrementAway(): void {
		awayScore = Math.max(0, awayScore - 1);
		handleScoreChange();
	}

	// Calculate prediction outcome - memoized to avoid recalculation
	let predictionOutcome = $derived(
		prediction && isFixtureCompleted
			? getPredictionOutcome(prediction.home, prediction.away, fixture.homeScore, fixture.awayScore)
			: null
	);

	function getPredictionOutcome(
		predHome: number,
		predAway: number,
		actualHome: number | null,
		actualAway: number | null
	) {
		if (actualHome === null || actualAway === null) return null;

		if (predHome === actualHome && predAway === actualAway) {
			return {
				type: 'perfect',
				text: `Perfect: ${3 * fixture.pointsMultiplier} pts`,
				class: 'bg-green-500 text-white'
			};
		} else if (
			(predHome > predAway && actualHome > actualAway) ||
			(predHome < predAway && actualHome < actualAway) ||
			(predHome === predAway && actualHome === actualAway)
		) {
			return {
				type: 'correct',
				text: `Correct Outcome: ${1 * fixture.pointsMultiplier} pts`,
				class: 'bg-yellow-500 text-black'
			};
		} else {
			return {
				type: 'incorrect',
				text: 'Incorrect: 0 pts',
				class: 'bg-red-500 text-white'
			};
		}
	}
</script>

<div
	class={`rounded-lg border ${isInvalid ? 'border-red-500' : 'border-slate-700'} overflow-hidden bg-slate-800 shadow-md`}
>
	<div class="flex items-center justify-between border-b border-slate-700 bg-slate-900 p-3">
		<div>
			<span class={`rounded-full px-2 py-1 text-xs font-medium ${statusDisplay.classes}`}>
				{statusDisplay.text}
			</span>
			{#if specialBadge}
				<span
					class={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${specialBadge.color} text-white`}
				>
					{specialBadge.text}
				</span>
			{/if}
		</div>
		<span class="text-sm text-slate-400">{formattedMatchDate}</span>
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
			{#if showActualScore}
				<!-- For completed fixtures or live matches, show the actual result -->
				<div class="flex flex-col items-center gap-2">
					<div class="flex items-center gap-2">
						{#if isFixtureLive}
							<div class="flex items-center gap-2">
								<div class="h-2 w-2 animate-pulse rounded-full bg-red-500"></div>
								<span class="animate-pulse text-xs font-bold text-red-400">LIVE</span>
							</div>
						{/if}
						<span class="text-lg font-bold text-white">{fixture.homeScore}</span>
						<span class="text-lg text-slate-400">-</span>
						<span class="text-lg font-bold text-white">{fixture.awayScore}</span>
					</div>

					{#if prediction !== undefined && prediction !== null}
						<div class="flex items-center gap-2">
							<span class="text-sm text-slate-400">Your prediction:</span>
							<span class="text-sm text-slate-300">{prediction.home} - {prediction.away}</span>

							{#if predictionOutcome && isFixtureCompleted}
								<span class={`rounded-full px-2 py-0.5 text-xs ${predictionOutcome.class}`}>
									{predictionOutcome.text}
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
					{#each ['home', 'away'] as team, index}
						{#if index === 1}
							<span class="mx-1 text-lg text-slate-400">-</span>
						{/if}

						<!-- Score input control -->
						<div class="flex items-center">
							<button
								type="button"
								class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-l bg-slate-700 text-white hover:bg-slate-600"
								onclick={() => (team === 'home' ? decrementHome() : decrementAway())}
							>
								-
							</button>
							<input
								type="number"
								min="0"
								max="20"
								class="h-8 w-10 border-t border-b border-slate-600 bg-slate-800 text-center text-white"
								value={team === 'home' ? homeScore : awayScore}
								oninput={(e) => {
									if (e && e.target && 'value' in e.target) {
										const value = parseInt(e.target.value as string);
										if (team === 'home') {
											homeScore = isNaN(value) ? 0 : value;
										} else {
											awayScore = isNaN(value) ? 0 : value;
										}
										handleScoreChange();
									}
								}}
							/>
							<button
								type="button"
								class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-r bg-slate-700 text-white hover:bg-slate-600"
								onclick={() => (team === 'home' ? incrementHome() : incrementAway())}
							>
								+
							</button>
						</div>
					{/each}
				</div>
			{:else}
				<!-- For non-predictable fixtures -->
				<div class="flex flex-col items-center gap-2">
					{#if !readOnly && !isPastWeek && (fixture.status === 'SCHEDULED' || fixture.status === 'TIMED') && fixture.predictionClosesAt}
						<div class="rounded-md bg-amber-900/30 p-2 text-center text-sm text-amber-300">
							<span>Predictions close {formatDate(fixture.predictionClosesAt)}</span>
						</div>
					{:else if prediction}
						<div class="flex items-center gap-2">
							<span class="text-sm text-slate-400">Your prediction:</span>
							<span class="text-sm text-slate-300">{prediction.home} - {prediction.away}</span>
						</div>
					{:else}
						<div class="flex items-center">
							<span class="text-slate-500 italic">No prediction</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		{#if isInvalid}
			<div class="mt-2 text-xs text-red-500">Please enter valid scores for this match</div>
		{/if}
	</div>
</div>
