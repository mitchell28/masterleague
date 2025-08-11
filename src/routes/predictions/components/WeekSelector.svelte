<script lang="ts">
	import { ChevronLeft, ChevronRight, ChevronDown } from '@lucide/svelte';

	// Props
	let { weeks, currentWeek, week, onWeekChange, onNavigate } = $props<{
		weeks: number[];
		currentWeek: number;
		week: number;
		onWeekChange: (newWeek: number) => void;
		onNavigate: (direction: 'prev' | 'next') => void;
	}>();

	// State
	let selectedWeek = $state(week);

	// Update selectedWeek when week prop changes
	$effect(() => {
		selectedWeek = week;
	});

	// Handle select change
	function handleSelectChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newWeek = parseInt(target.value, 10);
		if (!isNaN(newWeek)) {
			onWeekChange(newWeek);
		}
	}
</script>

<div class="week-selector flex items-center gap-4">
	<label for="week-selector" class="font-medium text-white">Go to week:</label>

	<!-- Previous week button -->
	<button
		class="bg-accent hover:bg-accent/80 flex h-10 w-10 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50"
		onclick={() => onNavigate('prev')}
		disabled={!weeks.includes(week - 1)}
		aria-label="Previous week"
	>
		<ChevronLeft class="text-black" size={18} />
	</button>

	<!-- Week Selector -->
	<div class="relative">
		<select
			bind:value={selectedWeek}
			onchange={handleSelectChange}
			class="custom-select border-accent w-full appearance-none rounded-md border-2 py-2 pr-10 pl-4 font-medium text-white transition-colors focus:outline-none"
		>
			{#each weeks as weekNumber}
				<option value={weekNumber} class=" text-white">
					Week {weekNumber}
				</option>
			{/each}
		</select>

		<!-- Custom dropdown arrow -->
		<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
			<ChevronDown size={16} class="text-accent transition-transform duration-200" />
		</div>
	</div>
	<!-- Next week button -->
	<button
		class="bg-accent hover:bg-accent/80 flex h-10 w-10 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50"
		onclick={() => onNavigate('next')}
		disabled={!weeks.includes(week + 1)}
		aria-label="Next week"
	>
		<ChevronRight class="text-black" size={18} />
	</button>
</div>

<style>
	/* Enhanced select styling with modern approach */
	.custom-select {
		/* Remove default appearance */
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;

		/* Custom styling */
		background: #0d1326;
		color: white;
		border-radius: 0.375rem;
		font-weight: 500;
		transition: all 0.2s;
		min-width: 140px;
	}

	.custom-select:hover {
		background: #0d1326;
	}

	.custom-select:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px rgb(from var(--color-accent) r g b / 0.3);
	}

	/* Style the dropdown arrow rotation on focus */
	.custom-select:focus + div :global(svg) {
		transform: rotate(180deg);
	}

	/* Option styling for supporting browsers */
	.custom-select option {
		background: #0d1326;
		color: white;
		padding: 0.75rem 1rem;
	}

	.custom-select option:hover,
	.custom-select option:checked {
		background: var(--color-accent);
		color: black;
	}

	/* Future-proofing: Opt into customizable select when supported */
	@supports (appearance: base-select) {
		.custom-select,
		.custom-select::picker(select) {
			appearance: base-select;
		}

		.custom-select::picker(select) {
			border: 2px solid var(--color-accent);
			border-radius: 0.375rem;
			background: #0d1326;
			padding: 0.25rem;
			margin-top: 0.25rem;
			box-shadow:
				0 10px 15px -3px rgb(0 0 0 / 0.1),
				0 4px 6px -4px rgb(0 0 0 / 0.1);

			/* Animation */
			opacity: 0;
			transition: all 0.2s allow-discrete;

			/* Anchor positioning */
			top: calc(anchor(bottom) + 0.25rem);
			left: anchor(left);
			min-width: anchor-size(width);
		}

		.custom-select::picker(select):popover-open {
			opacity: 1;
		}

		@starting-style {
			.custom-select::picker(select):popover-open {
				opacity: 0;
			}
		}
	}
</style>
