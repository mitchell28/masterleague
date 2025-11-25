<script lang="ts">
	// Simple fairy lights component
</script>

<div
	class="pointer-events-none fixed top-0 left-0 z-50 flex w-full justify-between overflow-hidden px-4"
	aria-hidden="true"
>
	{#each Array(20) as _, i}
		<div
			class="h-3 w-3 rounded-full shadow-lg"
			style="
                background-color: {i % 2 === 0 ? '#ff0000' : '#00ff00'};
                animation: twinkle 1s infinite alternate;
                animation-delay: {i * 0.1}s;
                margin-top: {i % 2 === 0 ? '-5px' : '5px'};
            "
		></div>
	{/each}
</div>

<style>
	@keyframes twinkle {
		from {
			opacity: 0.5;
			box-shadow: 0 0 5px currentColor;
		}
		to {
			opacity: 1;
			box-shadow: 0 0 15px currentColor;
		}
	}
</style>
