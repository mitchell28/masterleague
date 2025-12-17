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

	// Teams

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

	// Derive formatted date
	let formattedMatchDate = $derived(formatDate(fixture.matchDate));

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
				text: `+${3 * fixture.pointsMultiplier} pts`
			};
		} else if (
			(predHome > predAway && actualHome > actualAway) ||
			(predHome < predAway && actualHome < actualAway) ||
			(predHome === predAway && actualHome === actualAway)
		) {
			return {
				type: 'correct',
				text: `+${1 * fixture.pointsMultiplier} pts`
			};
		} else {
			return {
				type: 'incorrect',
				text: '0 pts'
			};
		}
	}

	// Helper function for date formatting - includes time
	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return (
			date.toLocaleDateString('en-GB', {
				weekday: 'short',
				day: 'numeric',
				month: 'short'
			}) +
			' ' +
			date.toLocaleTimeString('en-GB', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			})
		);
	}

	// svelte-ignore state_referenced_locally
	let initialHomeScore = prediction?.home ?? 0;
	// svelte-ignore state_referenced_locally
	let initialAwayScore = prediction?.away ?? 0;
	let homeScore = $state(initialHomeScore);
	let awayScore = $state(initialAwayScore);

	// Sync with prediction changes
	$effect(() => {
		if (prediction) {
			homeScore = prediction.home;
			awayScore = prediction.away;
		}
	});

	// Direct handler for score changes - debounce to prevent too many updates
	let updateTimeout: ReturnType<typeof setTimeout> | null = null;
	function handleScoreChange() {
		if (!readOnly) {
			if (updateTimeout) {
				clearTimeout(updateTimeout);
			}
			updateTimeout = setTimeout(() => {
				onUpdate(homeScore, awayScore);
			}, 300); // Increased debounce to 300ms
		}
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
		if (fixture.pointsMultiplier === 3) {
			return {
				text: '3X Points',
				color: 'bg-gradient-to-r from-yellow-400 to-amber-500'
			};
		} else if (fixture.pointsMultiplier === 2) {
			return {
				text: '2X Points',
				color: 'bg-gradient-to-r from-purple-500 to-purple-600'
			};
		} else if (fixture.pointsMultiplier === 1) {
			return {
				text: '1X Points',
				color: 'bg-accent'
			};
		} else if (fixture.pointsMultiplier > 3) {
			return {
				text: `${fixture.pointsMultiplier}X Points`,
				color: 'bg-gradient-to-r from-purple-400 to-purple-600'
			};
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
</script>

<!-- Rectangle 1 - Main Card Container with Custom Shape -->
<div class="font-display relative min-h-[180px] w-full overflow-clip text-sm sm:min-h-[220px]">
	<!-- Green middle notch - always present for card shape -->
	<div
		class="bg-accent absolute top-0 left-[33%] flex h-[26px] w-[34%] items-center justify-center"
	>
		<span class="text-xs text-black sm:text-sm">{statusDisplay.text}</span>
	</div>

	{#if specialBadge}
		<div
			class=" absolute bottom-0 left-[33%] flex h-[26px] w-[34%] items-center justify-center {specialBadge.color}"
		>
			<span class="pt-[2.5px] text-xs font-medium text-black">{specialBadge.text}</span>
		</div>
	{/if}

	<!-- Main card background -->
	<div
		class="absolute inset-0 bg-slate-900"
		style="clip-path: polygon(0% 9%, 5% 0%, 35% 0%, 40% 13%, 60% 13%, 65% 0%, 95% 0%, 100% 9%, 100% 91%, 95% 100%, 65% 100%, 60% 87%, 40% 87%, 35% 100%, 5% 100%, 0% 91%);"
	>
		<div class="relative h-full px-4 py-8 sm:px-10">
			<div
				class="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2  flex-col items-center gap-1 text-center sm:gap-2"
			>
				<!-- Date badge - hidden during live matches -->
				{#if !isFixtureLive && !isFixtureCompleted}
					<div
						style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
						class="bg-accent flex max-w-[120px] items-center sm:translate-y-0 -translate-y-[70%] justify-center px-2 pt-1.5 pb-1 text-center sm:max-w-none sm:px-3 sm:pt-2 sm:pb-1.5"
					>
						<span class="text-[10px] leading-[11px] text-black sm:text-sm sm:leading-3.5">
							{formattedMatchDate}
						</span>
					</div>
				{/if}

				<!-- Score display for completed and live matches -->
				{#if showActualScore}
					<div class="flex flex-col items-center gap-2 text-center">
						<span class="text-center text-xs font-medium text-slate-400">
							{isFixtureLive ? 'Live Score' : 'Result'}
						</span>
						<div class="flex items-center gap-2">
							<span class="text-base font-bold text-white sm:text-lg">{fixture.homeScore}</span>
							<span class="text-base text-slate-400 sm:text-lg">-</span>
							<span class="text-base font-bold text-white sm:text-lg">{fixture.awayScore}</span>
						</div>
					</div>
				{:else if !fixture.canPredict && !prediction}
					<span class="text-xs text-slate-500 italic sm:text-sm">No prediction</span>
				{/if}

				<!-- Prediction outcome bottom middle -->
				{#if predictionOutcome && isFixtureCompleted}
					<div class="flex text-center">
						<span class="text-xs font-medium text-gray-400">
							{predictionOutcome.text}
						</span>
					</div>
				{/if}

				<!-- Prediction close warning -->
				{#if !readOnly && !isPastWeek && (fixture.status === 'SCHEDULED' || fixture.status === 'TIMED') && fixture.predictionClosesAt && !fixture.canPredict}
					<div class="rounded-md bg-amber-900/30 p-1 text-center text-xs text-amber-300">
						<span>Predictions close {formatDate(fixture.predictionClosesAt)}</span>
					</div>
				{/if}
			</div>
			<!-- Card content will go here -->
			<div class="flex h-full items-center justify-between gap-2 text-sm sm:gap-3">
				<!-- Home team -->
				<div class="flex flex-col items-center gap-2">
					<!-- Logo -->
					{#if homeTeam.logo}
						<img
							src={homeTeam.logo}
							alt={homeTeam.name}
							class="h-10 w-10 object-contain sm:h-12 sm:w-12 md:h-14 md:w-14"
						/>
					{/if}
					<span class="text-center text-xs text-wrap sm:text-sm">{homeTeam.shortName}</span>

					<!-- Home Score Controls or Display -->
					<div>
						{#if showActualScore || !fixture.canPredict || readOnly}
							<!-- Show predicted score or read-only prediction -->
							<div class="flex flex-col items-center gap-1">
								{#if prediction}
									<span class="text-base text-slate-300 sm:text-lg">{prediction.home}</span>
									{#if showActualScore || isFixtureLive}
										<span class="text-xs text-slate-500">Predicted</span>
									{/if}
								{:else}
									<span class="text-slate-500">-</span>
								{/if}
							</div>
						{:else}
							<!-- Interactive prediction controls - Enhanced touch targets -->
							<div class="flex items-center">
								<button
									aria-label="Decrement Home Score"
									type="button"
									class="bg-accent flex h-10 w-10 min-h-10 min-w-10 touch-manipulation cursor-pointer items-center justify-center transition-all duration-150 select-none sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8 active:scale-90 active:brightness-90"
									style="clip-path: polygon(19% 0%, 100% 0%, 100% 85%, 81% 100%, 0% 100%, 0% 15%);"
									onclick={() => decrementHome()}
								>
									<div
										aria-label="Decrement Home Score"
										class="h-[3px] w-4 bg-black sm:h-1 sm:w-5"
									></div>
								</button>
								<input
									type="number"
									inputmode="numeric"
									pattern="[0-9]*"
									min="0"
									max="20"
									class="h-10 w-10 touch-manipulation text-center text-base text-white sm:h-8 sm:w-10 sm:text-base"
									value={homeScore}
									oninput={(e) => {
										const target = e.target as HTMLInputElement;
										const value = Math.max(0, Math.min(20, parseInt(target.value) || 0));
										homeScore = value;
										handleScoreChange();
									}}
								/>
								<button
									aria-label="Increment Home Score"
									type="button"
									class="bg-accent flex h-10 w-10 min-h-10 min-w-10 touch-manipulation cursor-pointer items-center justify-center text-black transition-all duration-150 select-none sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8 active:scale-90 active:brightness-90"
									style="clip-path: polygon(19% 0%, 100% 0%, 100% 85%, 81% 100%, 0% 100%, 0% 15%);"
									onclick={() => incrementHome()}
								>
									<div class="relative h-4 w-4 sm:h-5 sm:w-5">
										<div
											class="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-black sm:h-1"
										></div>
										<div
											class="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-black sm:w-1"
										></div>
									</div>
								</button>
							</div>
						{/if}
					</div>
				</div>

				<!-- Center section -->

				<div
					class="absolute inset-x-0 top-13 flex h-1 -translate-y-1/2 flex-col items-center gap-3"
				>
					<!-- Only show "No prediction made" message for completed matches without predictions -->
					{#if showActualScore && !prediction}
						<div class="-mt-1 flex items-center gap-2">
							<span class="text-xs text-slate-400 italic">No prediction made</span>
						</div>
					{/if}

					<!-- Error message -->
					{#if isInvalid}
						<div class="text-xs text-red-500">Enter valid scores</div>
					{/if}
				</div>

				<!-- Away team -->
				<div class="flex flex-col items-center gap-2">
					{#if awayTeam.logo}
						<img
							loading="lazy"
							src={awayTeam.logo}
							alt={awayTeam.name}
							class="h-10 w-10 object-contain sm:h-12 sm:w-12 md:h-14 md:w-14"
						/>
					{/if}
					<span class="text-center text-xs text-wrap sm:text-sm">{awayTeam.shortName}</span>

					<!-- Away Score Controls or Display -->
					<div>
						{#if showActualScore || !fixture.canPredict || readOnly}
							<!-- Show predicted score or read-only prediction -->
							<div class="flex flex-col items-center gap-1">
								{#if prediction}
									<span class="text-base text-slate-300 sm:text-lg">{prediction.away}</span>
									{#if showActualScore || isFixtureLive}
										<span class="text-xs text-slate-500">Predicted</span>
									{/if}
								{:else}
									<span class="text-slate-500">-</span>
								{/if}
							</div>
						{:else}
							<!-- Interactive prediction controls - Enhanced touch targets -->
							<div class="flex items-center">
								<button
									aria-label="Decrement Away Score"
									type="button"
									class="bg-accent flex h-10 w-10 min-h-10 min-w-10 touch-manipulation cursor-pointer items-center justify-center transition-all duration-150 select-none sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8 active:scale-90 active:brightness-90"
									style="clip-path: polygon(19% 0%, 100% 0%, 100% 85%, 81% 100%, 0% 100%, 0% 15%);"
									onclick={() => decrementAway()}
								>
									<div
										aria-label="Decrement Away Score"
										class="h-[3px] w-4 bg-black sm:h-1 sm:w-5"
									></div>
								</button>
								<input
									type="number"
									inputmode="numeric"
									pattern="[0-9]*"
									min="0"
									max="20"
									class="h-10 w-10 touch-manipulation text-center text-base text-white sm:h-8 sm:w-10 sm:text-base"
									value={awayScore}
									oninput={(e) => {
										const target = e.target as HTMLInputElement;
										const value = Math.max(0, Math.min(20, parseInt(target.value) || 0));
										awayScore = value;
										handleScoreChange();
									}}
								/>
								<button
									aria-label="Increment Away Score"
									type="button"
									class="bg-accent flex h-10 w-10 min-h-10 min-w-10 touch-manipulation cursor-pointer items-center justify-center text-black transition-all duration-150 select-none sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8 active:scale-90 active:brightness-90"
									style="clip-path: polygon(19% 0%, 100% 0%, 100% 85%, 81% 100%, 0% 100%, 0% 15%);"
									onclick={() => incrementAway()}
								>
									<div class="relative h-4 w-4 sm:h-5 sm:w-5">
										<div
											class="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-black sm:h-1"
										></div>
										<div
											class="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-black sm:w-1"
										></div>
									</div>
								</button>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
