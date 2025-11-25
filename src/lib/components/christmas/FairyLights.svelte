<script lang="ts">
	// Christmas string lights hanging across the top
	const colors = [
		'#ff3333',
		'#33ff33',
		'#ffcc00',
		'#ff3333',
		'#33ff33',
		'#ffcc00',
		'#ff3333',
		'#33ff33',
		'#ffcc00',
		'#ff3333',
		'#33ff33',
		'#ffcc00'
	];
</script>

<!-- String lights with wire and hanging bulbs -->
<div class="pointer-events-none fixed top-0 left-0 z-40 w-full" aria-hidden="true">
	<!-- The wire/string -->
	<svg class="h-20 w-full" viewBox="0 0 1200 80" preserveAspectRatio="none">
		<path
			d="M0,10 Q100,40 200,15 Q300,50 400,20 Q500,55 600,15 Q700,50 800,20 Q900,55 1000,15 Q1100,45 1200,10"
			stroke="#333"
			stroke-width="3"
			fill="none"
		/>
	</svg>

	<!-- Hanging bulbs positioned along the curve -->
	<div class="absolute top-0 left-0 flex w-full justify-between px-8">
		{#each colors as color, i}
			<div class="relative" style="margin-top: {10 + Math.sin(i * 0.8) * 25}px;">
				<!-- Wire to bulb -->
				<div class="mx-auto h-3 w-0.5 bg-gray-600"></div>
				<!-- Bulb -->
				<div
					class="bulb h-4 w-3 rounded-b-full"
					style="
						background: {color};
						animation-delay: {i * 0.2}s;
						box-shadow: 0 0 10px {color}, 0 0 20px {color}40;
					"
				></div>
			</div>
		{/each}
	</div>
</div>

<style>
	.bulb {
		animation: glow 1.5s ease-in-out infinite alternate;
	}

	@keyframes glow {
		0% {
			opacity: 0.6;
			filter: brightness(0.8);
		}
		100% {
			opacity: 1;
			filter: brightness(1.3);
		}
	}
</style>
