<script lang="ts">
	import { animate, stagger } from 'motion';

	let heroRef = $state<HTMLElement>();
	let titleRef = $state<HTMLElement>();
	let subtitleRef = $state<HTMLElement>();
	let statsRef = $state<HTMLElement>();
	let ctaRef = $state<HTMLElement>();
	let featuresRef = $state<HTMLElement>();
	let pitchLinesRef = $state<HTMLElement>();

	// Effect for animations
	$effect(() => {
		if (pitchLinesRef) {
			animate(
				pitchLinesRef,
				{ opacity: [0, 1], scale: [0.95, 1] },
				{ duration: 1.5, ease: 'easeOut' }
			);
		}

		if (titleRef) {
			animate(
				titleRef,
				{ opacity: [0, 1], y: [40, 0], scale: [0.95, 1] },
				{ duration: 0.8, delay: 0.2, ease: 'easeOut' }
			);
		}

		if (subtitleRef) {
			animate(
				subtitleRef,
				{ opacity: [0, 1], y: [30, 0] },
				{ duration: 0.7, delay: 0.4, ease: 'easeOut' }
			);
		}

		if (ctaRef) {
			animate(
				ctaRef,
				{ opacity: [0, 1], y: [20, 0] },
				{ duration: 0.6, delay: 0.6, ease: 'easeOut' }
			);
		}

		if (statsRef) {
			animate(
				statsRef,
				{ opacity: [0, 1], y: [30, 0] },
				{ duration: 0.7, delay: 0.8, ease: 'easeOut' }
			);
		}

		if (featuresRef) {
			const cards = featuresRef.querySelectorAll('.feature-card');
			animate(
				cards,
				{ opacity: [0, 1], y: [40, 0], scale: [0.9, 1] },
				{ duration: 0.5, delay: stagger(0.15), ease: 'easeOut' }
			);
		}
	});
</script>

<!-- Hero Section with Football Pitch Aesthetic -->
<div bind:this={heroRef} class="relative min-h-screen overflow-hidden">
	<!-- Animated Football Pitch Lines Background -->
	<div bind:this={pitchLinesRef} class="pointer-events-none absolute inset-0 opacity-0">
		<!-- Center circle -->
		<div
			class="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 md:h-96 md:w-96"
		></div>
		<div
			class="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20"
		></div>

		<!-- Horizontal pitch lines -->
		<div
			class="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-linear-to-r from-transparent via-white/10 to-transparent"
		></div>

		<!-- Vertical accent lines -->
		<div
			class="absolute top-0 bottom-0 left-1/4 w-px bg-linear-to-b from-transparent via-white/5 to-transparent"
		></div>
		<div
			class="absolute top-0 right-1/4 bottom-0 w-px bg-linear-to-b from-transparent via-white/5 to-transparent"
		></div>
	</div>

	<!-- Glowing accent orbs -->
	<div class="pointer-events-none absolute inset-0">
		<div
			class="bg-accent/5 absolute top-1/4 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
		></div>
		<div
			class="bg-accent/8 absolute right-1/4 bottom-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full blur-[100px]"
		></div>
	</div>

	<!-- Main Content -->
	<div class="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-20">
		<div class="container mx-auto max-w-6xl">
			<!-- Badge -->
			<div class="mb-8 flex justify-center">
				<div
					class="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm"
				>
					<span class="relative flex h-2 w-2">
						<span
							class="bg-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
						></span>
						<span class="bg-accent relative inline-flex h-2 w-2 rounded-full"></span>
					</span>
					<span class="text-sm font-medium text-white/80">Season 2024/25 is Live</span>
				</div>
			</div>

			<!-- Title -->
			<div bind:this={titleRef} class="mb-6 text-center opacity-0">
				<h1
					class="text-5xl font-black tracking-tight sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl"
				>
					<span
						class="block bg-linear-to-r from-white via-white to-white/60 bg-clip-text text-transparent"
					>
						PREDICT.
					</span>
					<span
						class="from-accent via-accent block bg-linear-to-r to-emerald-400 bg-clip-text text-transparent"
					>
						COMPETE.
					</span>
					<span
						class="block bg-linear-to-r from-white/60 via-white to-white bg-clip-text text-transparent"
					>
						DOMINATE.
					</span>
				</h1>
			</div>

			<!-- Subtitle -->
			<div bind:this={subtitleRef} class="mb-10 text-center opacity-0">
				<p class="mx-auto max-w-2xl text-lg font-light text-white/70 sm:text-xl md:text-2xl">
					Join the ultimate Premier League prediction arena. Test your football IQ against friends
					and climb the leaderboard.
				</p>
			</div>
		</div>
	</div>
</div>
