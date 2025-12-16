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
		const count = 15; // Reduced for better performance
		const newSnowflakes = [];
		for (let i = 0; i < count; i++) {
			const size = Math.random() * 2 + 1; // 1-3px - smaller
			newSnowflakes.push({
				id: i,
				left: Math.random() * 100,
				animationDuration: Math.random() * 20 + 30, // 30-50s fall time - very gentle
				opacity: Math.random() * 0.3 + 0.15, // 0.15-0.45 - even softer
				delay: Math.random() * 30,
				size,
				drift: Math.random() * 10 + 3, // 3-13px - subtle drift
				swaySpeed: Math.random() * 2 + 4 // 4-6s sway cycle
			});
		}
		snowflakes = newSnowflakes;
	});
</script>

<div class="pointer-events-none fixed inset-0 z-40 overflow-hidden select-none" aria-hidden="true">
	{#each snowflakes as flake (flake.id)}
		<div
			class="snowflake absolute -top-5 rounded-full bg-white/90"
			style="
				left: {flake.left}%;
				opacity: {flake.opacity};
				width: {flake.size}px;
				height: {flake.size}px;
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
