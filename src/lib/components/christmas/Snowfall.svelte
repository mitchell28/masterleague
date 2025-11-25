<script lang="ts">
	let snowflakes: {
		id: number;
		left: number;
		animationDuration: number;
		opacity: number;
		delay: number;
	}[] = $state([]);

	$effect(() => {
		const count = 50;
		const newSnowflakes = [];
		for (let i = 0; i < count; i++) {
			newSnowflakes.push({
				id: i,
				left: Math.random() * 100,
				animationDuration: Math.random() * 5 + 5, // 5-10s fall time
				opacity: Math.random() * 0.5 + 0.3,
				delay: Math.random() * 5
			});
		}
		snowflakes = newSnowflakes;
	});
</script>

<div class="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
	{#each snowflakes as flake (flake.id)}
		<div
			class="snowflake absolute -top-5 h-2 w-2 rounded-full bg-white blur-[1px]"
			style="
				left: {flake.left}%;
				opacity: {flake.opacity};
				--fall-duration: {flake.animationDuration}s;
				--fall-delay: -{flake.delay}s;
			"
		></div>
	{/each}
</div>

<style>
	.snowflake {
		animation: fall var(--fall-duration) linear infinite;
		animation-delay: var(--fall-delay);
	}

	@keyframes fall {
		0% {
			transform: translateY(-10vh) translateX(0);
		}
		25% {
			transform: translateY(20vh) translateX(10px);
		}
		50% {
			transform: translateY(50vh) translateX(-10px);
		}
		75% {
			transform: translateY(80vh) translateX(10px);
		}
		100% {
			transform: translateY(110vh) translateX(0);
		}
	}
</style>
