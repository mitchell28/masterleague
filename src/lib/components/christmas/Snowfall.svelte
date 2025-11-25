<script lang="ts">
	let snowflakes: {
		id: number;
		left: number;
		animationDuration: number;
		opacity: number;
		delay: number;
		size: number;
		drift: number;
		swaySpeed: number;
	}[] = $state([]);

	$effect(() => {
		const count = 60;
		const newSnowflakes = [];
		for (let i = 0; i < count; i++) {
			const size = Math.random() * 3 + 1.5; // 1.5-4.5px - smaller, more realistic
			newSnowflakes.push({
				id: i,
				left: Math.random() * 100,
				animationDuration: Math.random() * 20 + 25, // 25-45s fall time - gentle
				opacity: Math.random() * 0.4 + 0.2, // 0.2-0.6 - softer
				delay: Math.random() * 25,
				size,
				drift: Math.random() * 15 + 5, // 5-20px - subtle drift
				swaySpeed: Math.random() * 2 + 3 // 3-5s sway cycle
			});
		}
		snowflakes = newSnowflakes;
	});
</script>

<div class="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
	{#each snowflakes as flake (flake.id)}
		<div
			class="snowflake absolute -top-5 rounded-full bg-white/90"
			style="
				left: {flake.left}%;
				opacity: {flake.opacity};
				width: {flake.size}px;
				height: {flake.size}px;
				filter: blur({flake.size > 3 ? 0.5 : 0}px);
				--fall-duration: {flake.animationDuration}s;
				--fall-delay: -{flake.delay}s;
				--drift: {flake.drift}px;
				--sway-speed: {flake.swaySpeed}s;
			"
		></div>
	{/each}
</div>

<style>
	.snowflake {
		animation:
			fall var(--fall-duration) linear infinite,
			sway var(--sway-speed) ease-in-out infinite;
		animation-delay: var(--fall-delay);
	}

	@keyframes fall {
		0% {
			transform: translateY(-2vh);
		}
		100% {
			transform: translateY(102vh);
		}
	}

	@keyframes sway {
		0%,
		100% {
			margin-left: 0;
		}
		25% {
			margin-left: var(--drift);
		}
		75% {
			margin-left: calc(var(--drift) * -1);
		}
	}
</style>
