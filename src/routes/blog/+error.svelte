<script lang="ts">
	import { page } from '$app/stores';
	import { animate } from 'motion';

	let errorRef = $state<HTMLElement>();

	$effect(() => {
		if (errorRef) {
			animate(errorRef, { opacity: [0, 1], y: [30, 0] }, { duration: 0.8, ease: 'easeOut' });
		}
	});
</script>

<svelte:head>
	<title>Post Not Found - Master League</title>
	<meta name="description" content="The post you're looking for could not be found." />
</svelte:head>

<main class="relative mx-auto mt-22 max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
	<div bind:this={errorRef} class="text-center opacity-0">
		<div class="mb-8">
			<span
				class="bg-accent font-display relative mb-4 inline-block px-4 pt-2 pb-1.5 text-sm font-medium text-black sm:text-base"
				style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
			>
				404 ERROR
			</span>
		</div>

		<h1 class="mb-6 text-4xl leading-tight font-bold sm:text-5xl lg:text-6xl">Post Not Found</h1>

		<p class="mx-auto mb-8 max-w-2xl text-lg text-white/80 sm:text-xl">
			The post you're looking for doesn't exist or has been moved.
		</p>

		<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
			<a
				href="/blog"
				class="bg-accent hover:bg-accent/90 inline-flex items-center px-8 py-4 text-lg font-semibold text-black transition-all duration-200 hover:scale-105 hover:shadow-lg"
				style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
			>
				View All Posts
			</a>

			<a
				href="/blog"
				class="inline-flex items-center bg-white/10 px-8 py-4 text-lg font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-white/20"
			>
				Go to Blog
			</a>
		</div>
	</div>

	<!-- Decorative Elements -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		<div
			class="bg-accent/5 absolute top-1/4 left-1/4 h-64 w-64 animate-pulse rounded-full blur-3xl"
		></div>
		<div
			class="absolute right-1/4 bottom-1/4 h-48 w-48 animate-pulse rounded-full bg-white/5 blur-3xl delay-1000"
		></div>
	</div>
</main>
