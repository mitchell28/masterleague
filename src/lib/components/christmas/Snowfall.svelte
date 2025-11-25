<script lang="ts">
	let snowflakes: {
		id: number;
		left: number;
		animationDuration: number;
		opacity: number;
		delay: number;
		size: number;
		drift: number;
	}[] = $state([]);

	$effect(() => {
		const count = 80;
		const newSnowflakes = [];
		for (let i = 0; i < count; i++) {
			newSnowflakes.push({
				id: i,
				left: Math.random() * 100,
				animationDuration: Math.random() * 15 + 20, // 20-35s fall time
				opacity: Math.random() * 0.6 + 0.2,
				delay: Math.random() * 20,
				size: Math.random() * 4 + 2, // 2-6px size variation
				drift: Math.random() * 30 + 10 // 10-40px horizontal drift
			});
		}
		snowflakes = newSnowflakes;
	});
</script>

<div class="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
	{#each snowflakes as flake (flake.id)}
		<div
			class="snowflake absolute -top-5 rounded-full bg-white"
			style="
				left: {flake.left}%;
				opacity: {flake.opacity};
				width: {flake.size}px;
				height: {flake.size}px;
				filter: blur({flake.size > 4 ? 1 : 0}px);
				--fall-duration: {flake.animationDuration}s;
				--fall-delay: -{flake.delay}s;
				--drift: {flake.drift}px;
			"
		></div>
	{/each}
</div>

<style>
	.snowflake {
		animation: fall var(--fall-duration) ease-in-out infinite;
		animation-delay: var(--fall-delay);
	}

	@keyframes fall {
		0% {
			transform: translateY(-5vh) translateX(0) rotate(0deg);
		}
		20% {
			transform: translateY(18vh) translateX(var(--drift)) rotate(90deg);
		}
		40% {
			transform: translateY(38vh) translateX(calc(var(--drift) * -0.5)) rotate(180deg);
		}
		60% {
			transform: translateY(58vh) translateX(var(--drift)) rotate(270deg);
		}
		80% {
			transform: translateY(78vh) translateX(calc(var(--drift) * -0.3)) rotate(360deg);
		}
		100% {
			transform: translateY(105vh) translateX(calc(var(--drift) * 0.5)) rotate(450deg);
		}
	}
</style>
