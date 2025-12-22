<script lang="ts">
	// Using CSS animations instead of JS for better performance
</script>

<style>
	/* CSS-based animations for better performance */
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	
	.animate-fade-in-up {
		animation: fadeInUp 0.6s ease-out forwards;
	}
	
	.animate-fade-in {
		animation: fadeIn 0.8s ease-out forwards;
	}
	
	.delay-100 { animation-delay: 0.1s; opacity: 0; }
	.delay-200 { animation-delay: 0.2s; opacity: 0; }
</style>

<!-- Hero Section with Football Pitch Aesthetic -->
<div class="relative overflow-hidden">
	<!-- Animated Football Pitch Lines Background -->
	<div class="pointer-events-none absolute inset-0 animate-fade-in">
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

	<!-- Main Content -->
	<div class="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 -mt-20">
		<div class="container mx-auto max-w-6xl">
			<!-- Badge -->
			<div class="mb-8 flex justify-center">
				<div
					class="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-4 py-2"
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
			<div class="animate-fade-in-up mb-6 text-center delay-100">
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
			<div class="animate-fade-in-up mb-10 text-center delay-200">
				<p class="mx-auto max-w-2xl text-lg font-light text-white/70 sm:text-xl md:text-2xl">
					Join the ultimate Premier League prediction arena. Test your football IQ against friends
					and climb the leaderboard.
				</p>
			</div>
		</div>
	</div>
</div>
