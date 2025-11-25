<script lang="ts">
	// Fairy lights that wrap around an element
	const colors = ['#ff0000', '#00ff00', '#ffcc00', '#0099ff', '#ff66cc'];
</script>

<div class="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
	<!-- Top edge -->
	<div class="absolute top-0 left-0 flex w-full justify-around px-1">
		{#each Array(8) as _, i}
			<div
				class="h-2 w-2 rounded-full light"
				style="
					background-color: {colors[i % colors.length]};
					animation-delay: {i * 0.15}s;
					box-shadow: 0 0 6px {colors[i % colors.length]};
				"
			></div>
		{/each}
	</div>
	<!-- Bottom edge -->
	<div class="absolute bottom-0 left-0 flex w-full justify-around px-1">
		{#each Array(8) as _, i}
			<div
				class="h-2 w-2 rounded-full light"
				style="
					background-color: {colors[(i + 2) % colors.length]};
					animation-delay: {i * 0.15 + 0.5}s;
					box-shadow: 0 0 6px {colors[(i + 2) % colors.length]};
				"
			></div>
		{/each}
	</div>
	<!-- Left edge -->
	<div class="absolute top-0 left-0 flex h-full flex-col justify-around py-1">
		{#each Array(6) as _, i}
			<div
				class="h-2 w-2 rounded-full light"
				style="
					background-color: {colors[(i + 1) % colors.length]};
					animation-delay: {i * 0.15 + 0.25}s;
					box-shadow: 0 0 6px {colors[(i + 1) % colors.length]};
				"
			></div>
		{/each}
	</div>
	<!-- Right edge -->
	<div class="absolute top-0 right-0 flex h-full flex-col justify-around py-1">
		{#each Array(6) as _, i}
			<div
				class="h-2 w-2 rounded-full light"
				style="
					background-color: {colors[(i + 3) % colors.length]};
					animation-delay: {i * 0.15 + 0.75}s;
					box-shadow: 0 0 6px {colors[(i + 3) % colors.length]};
				"
			></div>
		{/each}
	</div>
</div>

<style>
	.light {
		animation: flash 0.5s infinite alternate;
	}

	@keyframes flash {
		0% {
			opacity: 0.3;
			transform: scale(0.8);
		}
		100% {
			opacity: 1;
			transform: scale(1.1);
		}
	}
</style>
