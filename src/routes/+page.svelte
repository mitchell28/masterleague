<script lang="ts">
	import { animate } from 'motion';
	import logo from '$lib/assets/logo/masterleague.svg';
	import CountdownTimer from '$lib/components/ui/CountdownTimer.svelte';

	// Get initialized data from the server
	let { data } = $props();
	let upcomingFixtures = $state(data.upcomingFixtures);

	// Target date: Friday, Aug 15, 8:00 PM (2025)
	const targetDate = new Date('2025-08-15T20:00:00');

	let heroRef = $state<HTMLElement>();
	let logoRef = $state<HTMLElement>();
	let titleRef = $state<HTMLElement>();
	let subtitleRef = $state<HTMLElement>();

	// Effect for animations
	$effect(() => {
		// Animate elements on load
		if (logoRef) {
			animate(
				logoRef,
				{ opacity: [0, 1], scale: [0.8, 1], rotateY: [180, 0] },
				{ duration: 1, ease: 'easeOut' }
			);
		}

		if (titleRef) {
			animate(
				titleRef,
				{ opacity: [0, 1], y: [30, 0] },
				{ duration: 0.8, delay: 0.3, ease: 'easeOut' }
			);
		}

		if (subtitleRef) {
			animate(
				subtitleRef,
				{ opacity: [0, 1], y: [20, 0] },
				{ duration: 0.8, delay: 0.5, ease: 'easeOut' }
			);
		}
	});
</script>

<div bind:this={heroRef} class="relative mt-22 flex min-h-screen items-center justify-center p-4">
	<div class="container mx-auto max-w-4xl space-y-12 text-center">
		<!-- Logo -->

		<!-- Main Title -->
		<div bind:this={titleRef} class="space-y-4 opacity-0">
			<h1
				class="font-display text-4xl font-black tracking-tight sm:text-5xl md:text-7xl lg:text-8xl"
			>
				<span
					class="from-accent to-accent bg-gradient-to-r via-white bg-clip-text text-transparent"
				>
					Master League
				</span>
			</h1>
			<div bind:this={subtitleRef} class="opacity-0">
				<p class="mx-auto max-w-2xl text-xl font-light text-white/80 sm:text-2xl md:text-3xl">
					Landing Page Coming Soon
				</p>
			</div>
		</div>

		<!-- Countdown Timer -->
		<div class="space-y-6">
			<p class="text-accent text-lg font-medium sm:text-xl">Launching in:</p>
			<div class="inline-block p-6 sm:p-8">
				<CountdownTimer {targetDate} />
			</div>
		</div>

		<!-- Additional Info -->
		<div class="pt-8">
			<div class="mx-auto inline-block max-w-lg p-6">
				<p class="text-sm leading-relaxed text-white/70 sm:text-base">
					The ultimate football prediction platform is coming. Get ready for a revolutionary way to
					compete with friends and climb the leaderboard.
				</p>
			</div>
		</div>
	</div>

	<!-- Decorative Elements -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		<!-- Gradient orbs -->
		<div
			class="bg-accent/10 absolute top-1/4 left-1/4 h-64 w-64 animate-pulse rounded-full blur-3xl"
		></div>
		<div
			class="absolute right-1/4 bottom-1/4 h-48 w-48 animate-pulse rounded-full bg-white/5 blur-3xl delay-1000"
		></div>
		<div
			class="bg-accent/15 absolute top-1/2 right-1/3 h-32 w-32 animate-pulse rounded-full blur-2xl delay-500"
		></div>
	</div>
</div>
