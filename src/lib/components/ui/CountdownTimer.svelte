<script lang="ts">
	import { animate } from 'motion';
	import { onMount } from 'svelte';

	type Props = {
		targetDate: Date;
		className?: string;
	};

	let { targetDate, className = '' }: Props = $props();

	let timeLeft = $state({
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0
	});

	let countdownElements = $state<{ [key: string]: HTMLElement }>({});
	let previousTimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
	let hasAnimatedInitial = false;

	function calculateTimeLeft() {
		const now = new Date().getTime();
		const target = targetDate.getTime();
		const difference = target - now;

		if (difference > 0) {
			return {
				days: Math.floor(difference / (1000 * 60 * 60 * 24)),
				hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
				minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
				seconds: Math.floor((difference % (1000 * 60)) / 1000)
			};
		} else {
			return { days: 0, hours: 0, minutes: 0, seconds: 0 };
		}
	}

	function updateTimer() {
		const newTimeLeft = calculateTimeLeft();

		// Check for changes and animate if needed
		Object.keys(newTimeLeft).forEach((key) => {
			if (
				newTimeLeft[key as keyof typeof newTimeLeft] !==
				previousTimeLeft[key as keyof typeof previousTimeLeft]
			) {
				const element = countdownElements[key];
				if (element && hasAnimatedInitial) {
					animate(
						element,
						{ scale: [1, 1.1, 1], rotateY: [0, 360, 0] },
						{ duration: 0.6, ease: 'easeOut' }
					);
				}
			}
		});

		previousTimeLeft = { ...newTimeLeft };
		timeLeft = newTimeLeft;
	}

	onMount(() => {
		// Initial calculation
		updateTimer();

		// Set up timer
		const interval = setInterval(updateTimer, 1000);

		// Animate initial load after a short delay to ensure elements are bound
		setTimeout(() => {
			Object.values(countdownElements).forEach((element, index) => {
				if (element) {
					animate(
						element,
						{ opacity: [0, 1], y: [20, 0] },
						{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }
					);
				}
			});
			hasAnimatedInitial = true;
		}, 100);

		return () => {
			clearInterval(interval);
		};
	});
</script>

<div class={`flex items-center justify-center gap-4 sm:gap-8 ${className}`}>
	{#each [{ key: 'days', label: 'Days', value: timeLeft.days }, { key: 'hours', label: 'Hours', value: timeLeft.hours }, { key: 'minutes', label: 'Minutes', value: timeLeft.minutes }, { key: 'seconds', label: 'Seconds', value: timeLeft.seconds }] as { key, label, value }}
		<div class="flex flex-col items-center">
			<div
				bind:this={countdownElements[key]}
				class="font-display text-accent mb-2 text-3xl font-bold opacity-0 sm:text-4xl md:text-6xl"
			>
				{value.toString().padStart(2, '0')}
			</div>
			<div class="text-xs tracking-wider text-white/70 uppercase sm:text-sm">
				{label}
			</div>
		</div>
	{/each}
</div>
