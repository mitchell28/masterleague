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
				text: `Perfect +${3 * fixture.pointsMultiplier} pts`,
				class: 'text-white'
			};
		} else if (
			(predHome > predAway && actualHome > actualAway) ||
			(predHome < predAway && actualHome < actualAway) ||
			(predHome === predAway && actualHome === actualAway)
		) {
			return {
				type: 'correct',
				text: `Correct +${1 * fixture.pointsMultiplier} pts`,
				class: 'text-white'
			};
		} else {
			return {
				type: 'incorrect',
				text: 'Incorrect +0 pts',
				class: 'text-white'
			};
		}
	}

	// Helper function for date formatting - no time, just date
	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
	}

	// Initialize state with runes
	let homeScore = $state(prediction?.home ?? 0);
	let awayScore = $state(prediction?.away ?? 0);

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
<div
	class="font-display border-b-accent relative min-h-[180px] w-full overflow-clip border-b-6 text-sm sm:min-h-[210px]"
>
	<!-- Green middle notch - always present for card shape -->
	<div
		class="bg-accent absolute top-0 left-[33%] flex h-[26px] w-[34%] items-center justify-center"
	>
		<span class="text-xs text-black sm:text-sm">{statusDisplay.text}</span>
	</div>

	<!-- Main card background -->
	<div
		class="absolute inset-0 bg-slate-900"
		style="clip-path: polygon(0% 9%, 5% 0%, 35% 0%, 40% 13%, 60% 13%, 65% 0%, 95% 0%, 100% 9%, 100% 100%, 0% 100%);"
	>
		<!-- Prediction outcome badge in top left -->
		{#if predictionOutcome && isFixtureCompleted}
			<div class="absolute top-2 left-3 sm:left-5">
				<span class={`text-xs font-medium ${predictionOutcome.class} sm:text-sm`}>
					{predictionOutcome.text}
				</span>
			</div>
		{/if}

		<div class="relative px-4 pt-8 pb-4 sm:px-6">
			<!-- Card content will go here -->
			<div class="flex h-full items-start justify-between gap-2 text-sm sm:gap-3">
				<!-- Home team -->
				<div class="flex flex-col items-center gap-3">
					<!-- Logo -->
					{#if homeTeam.logo}
						<img
							src={homeTeam.logo}
							alt={homeTeam.name}
							class="h-12 w-12 object-contain sm:h-16 sm:w-16 md:h-18 md:w-18"
						/>
					{/if}
					<span class="text-center text-xs text-wrap sm:text-sm">{homeTeam.shortName}</span>

					<!-- Home Score Controls or Display -->
					<div class="font-sans">
						{#if showActualScore || !fixture.canPredict || readOnly}
							<!-- Show actual score or read-only prediction -->
							<div class="flex h-8 w-20 items-center justify-center sm:w-24">
								{#if showActualScore}
									<span class="text-base font-bold text-white sm:text-lg">{fixture.homeScore}</span>
								{:else if prediction}
									<span class="text-base text-slate-300 sm:text-lg">{prediction.home}</span>
								{:else}
									<span class="text-slate-500">-</span>
								{/if}
							</div>
						{:else}
							<!-- Interactive prediction controls -->
							<div class="flex items-center">
								<button
									aria-label="Decrement Home Score"
									type="button"
									class="bg-accent hover:bg-accent/80 flex h-7 w-7 cursor-pointer items-center justify-center sm:h-8 sm:w-8"
									style="clip-path: polygon(19% 0%, 100% 0%, 100% 85%, 81% 100%, 0% 100%, 0% 15%);"
									onclick={() => decrementHome()}
								>
									<div
										aria-label="Decrement Home Score"
										class="h-[3px] w-4 bg-black sm:h-[4px] sm:w-5"
									></div>
								</button>
								<input
									type="number"
									min="0"
									max="20"
									class="h-7 w-8 text-center text-sm text-white sm:h-8 sm:w-10 sm:text-base"
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
									class="bg-accent hover:bg-accent/80 flex h-7 w-7 cursor-pointer items-center justify-center text-black sm:h-8 sm:w-8"
									style="clip-path: polygon(19% 0%, 100% 0%, 100% 85%, 81% 100%, 0% 100%, 0% 15%);"
									onclick={() => incrementHome()}
								>
									<div class="relative h-4 w-4 sm:h-5 sm:w-5">
										<div
											class="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-black sm:h-[4px]"
										></div>
										<div
											class="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-black sm:w-[4px]"
										></div>
									</div>
								</button>
							</div>
						{/if}
					</div>
				</div>

				<!-- Center section -->

				<div
					class="absolute inset-x-0 top-13 flex h-[4px] -translate-y-1/2 flex-col items-center gap-3"
				>
					<!-- Prediction outcome for completed matches -->
					{#if prediction !== undefined && prediction !== null && showActualScore}
						<div class="flex items-center gap-2">
							<span class="text-xs text-slate-400">Prediction:</span>
							<span class="text-xs text-slate-300">{prediction.home} - {prediction.away}</span>
						</div>
					{:else if showActualScore && !prediction}
						<div class="flex items-center gap-2">
							<span class="text-xs text-slate-400 italic">No prediction made</span>
							{#if isPastWeek}
								<span class="rounded-full bg-gray-600 px-2 py-0.5 text-xs text-white"
									>No Points</span
								>
							{/if}
						</div>
					{/if}

					<!-- Error message -->
					{#if isInvalid}
						<div class="text-xs text-red-500">Enter valid scores</div>
					{/if}
				</div>

				<div
					class="absolute top-16 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 md:top-20"
				>
					<!-- Date badge - hidden during live matches -->
					{#if !isFixtureLive && !isFixtureCompleted}
						<div
							style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
							class="bg-accent flex items-center justify-center px-2 pt-[6px] pb-[4px] text-center sm:px-3 sm:pt-[8px] sm:pb-[6px]"
						>
							<span class="text-xs leading-[12px] text-black sm:text-sm sm:leading-[14px]">
								{formattedMatchDate}
							</span>
						</div>
					{/if}

					<!-- Score display for completed and live matches -->
					{#if showActualScore}
						<div class="absolute top-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
							<div class="flex items-center gap-2">
								<span class="text-base font-bold text-white sm:text-lg">{fixture.homeScore}</span>
								<span class="text-base text-slate-400 sm:text-lg">-</span>
								<span class="text-base font-bold text-white sm:text-lg">{fixture.awayScore}</span>
							</div>
						</div>
					{:else if !fixture.canPredict && prediction && !isFixtureCompleted}
						<!-- Show prediction when not editable -->
						<div class="flex items-center gap-2">
							<span class="text-base text-slate-300 sm:text-lg">{prediction.home}</span>
							<span class="text-base text-slate-400 sm:text-lg">-</span>
							<span class="text-base text-slate-300 sm:text-lg">{prediction.away}</span>
						</div>
					{:else if !fixture.canPredict && !prediction}
						<span class="text-xs text-slate-500 italic sm:text-sm">No prediction</span>
					{/if}

					<!-- Prediction close warning -->
					{#if !readOnly && !isPastWeek && (fixture.status === 'SCHEDULED' || fixture.status === 'TIMED') && fixture.predictionClosesAt && !fixture.canPredict}
						<div class="rounded-md bg-amber-900/30 p-1 text-center text-xs text-amber-300">
							<span>Predictions close {formatDate(fixture.predictionClosesAt)}</span>
						</div>
					{/if}
				</div>

				<!-- Away team -->
				<div class="flex flex-col items-center gap-3">
					{#if awayTeam.logo}
						<img
							src={awayTeam.logo}
							alt={awayTeam.name}
							class="h-12 w-12 object-contain sm:h-16 sm:w-16 md:h-18 md:w-18"
						/>
					{/if}
					<span class="text-center text-xs text-wrap sm:text-sm">{awayTeam.shortName}</span>

					<!-- Away Score Controls or Display -->
					<div class="font-sans">
						{#if showActualScore || !fixture.canPredict || readOnly}
							<!-- Show actual score or read-only prediction -->
							<div class="flex h-8 w-20 items-center justify-center sm:w-24">
								{#if showActualScore}
									<span class="text-base font-bold text-white sm:text-lg">{fixture.awayScore}</span>
								{:else if prediction}
									<span class="text-base text-slate-300 sm:text-lg">{prediction.away}</span>
								{:else}
									<span class="text-slate-500">-</span>
								{/if}
							</div>
						{:else}
							<!-- Interactive prediction controls -->
							<div class="flex items-center">
								<button
									aria-label="Decrement Away Score"
									type="button"
									class="bg-accent hover:bg-accent/80 flex h-7 w-7 cursor-pointer items-center justify-center sm:h-8 sm:w-8"
									style="clip-path: polygon(19% 0%, 100% 0%, 100% 85%, 81% 100%, 0% 100%, 0% 15%);"
									onclick={() => decrementAway()}
								>
									<div
										aria-label="Decrement Away Score"
										class="h-[3px] w-4 bg-black sm:h-[4px] sm:w-5"
									></div>
								</button>
								<input
									type="number"
									min="0"
									max="20"
									class="h-7 w-8 text-center text-sm text-white sm:h-8 sm:w-10 sm:text-base"
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
									class="bg-accent hover:bg-accent/80 flex h-7 w-7 cursor-pointer items-center justify-center text-black sm:h-8 sm:w-8"
									style="clip-path: polygon(19% 0%, 100% 0%, 100% 85%, 81% 100%, 0% 100%, 0% 15%);"
									onclick={() => incrementAway()}
								>
									<div class="relative h-4 w-4 sm:h-5 sm:w-5">
										<div
											class="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-black sm:h-[4px]"
										></div>
										<div
											class="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-black sm:w-[4px]"
										></div>
									</div>
								</button>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Bottom section for prediction outcomes and status -->

			<!-- Points multiplier badge at bottom -->
			{#if specialBadge}
				<div class="absolute bottom-5 left-1/2 -translate-x-1/2">
					<div
						style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
						class="flex items-center justify-center px-3 pt-[6px] pb-[4px] text-center {specialBadge.color}"
					>
						<span class="text-xs leading-[12px] font-medium text-black">{specialBadge.text}</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
