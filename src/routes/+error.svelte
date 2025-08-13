<script lang="ts">
	import { page } from '$app/state';
	import { ChevronLeft, AlertCircle, Home } from '@lucide/svelte';
	import { fade, scale } from 'svelte/transition';
	import { animate } from 'motion';

	let errorIconRef = $state<HTMLElement>();
	let contentRef = $state<HTMLElement>();

	// Effect for animations
	$effect(() => {
		if (errorIconRef) {
			animate(
				errorIconRef,
				{ opacity: [0, 1], scale: [0.5, 1], rotate: [180, 0] },
				{ duration: 0.8, ease: 'easeOut' }
			);
		}

		if (contentRef) {
			animate(
				contentRef,
				{ opacity: [0, 1], y: [30, 0] },
				{ duration: 0.8, delay: 0.2, ease: 'easeOut' }
			);
		}
	});
</script>

<div class="relative flex min-h-screen items-center justify-center px-4">
	<div
		in:fade={{ duration: 300, delay: 100 }}
		class="container mx-auto flex max-w-4xl flex-col items-center justify-center text-center"
	>
		<!-- Error Icon -->
		<div bind:this={errorIconRef} class="mb-8 opacity-0">
			<div
				class="bg-accent/20 border-accent/30 text-accent flex size-24 items-center justify-center rounded-full border-2"
			>
				<AlertCircle size={48} />
			</div>
		</div>

		<!-- Content -->
		<div bind:this={contentRef} class="opacity-0">
			<!-- Error Code Badge -->
			<div class="mb-6">
				<span
					class="bg-accent font-display relative inline-block px-6 pt-3 pb-2 text-lg font-bold text-black"
					style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
				>
					{page.status} ERROR
				</span>
			</div>

			<!-- Main Error Message -->
			<h1 class="mb-4 text-4xl leading-tight font-bold sm:text-5xl lg:text-6xl">
				<span
					class="from-accent to-accent bg-gradient-to-r via-white bg-clip-text text-transparent"
				>
					Something Went Wrong
				</span>
			</h1>

			<p class="mx-auto mb-8 max-w-2xl text-lg text-white/80 sm:text-xl">
				{page.error?.message ||
					'We encountered an unexpected error. Please try again or return to the homepage.'}
			</p>

			<!-- Action Buttons -->
			<div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
				<a
					href="/"
					style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
					class="bg-accent hover:bg-accent/90 inline-flex items-center gap-3 px-8 py-4 text-lg font-semibold text-black transition-all duration-200 hover:scale-105 hover:shadow-lg"
				>
					<Home size={20} />
					Go Home
				</a>

				<button
					onclick={() => history.back()}
					style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
					class="inline-flex items-center gap-3 bg-white/5 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/10 hover:shadow-lg"
				>
					<ChevronLeft size={20} />
					Go Back
				</button>
			</div>
		</div>

		<!-- Developer Error Details -->
		{#if import.meta.env.DEV && page.error}
			<div
				in:scale={{ duration: 300, delay: 400 }}
				class="border-accent/20 mt-12 w-full max-w-3xl overflow-hidden rounded-lg border bg-white/5 p-6 text-left backdrop-blur-sm"
			>
				<h3 class="text-accent mb-4 text-lg font-bold">Developer Error Details:</h3>
				<pre
					class="overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-white/80">{JSON.stringify(
						page.error,
						null,
						2
					)}</pre>
			</div>
		{/if}
	</div>

	<!-- Decorative Background Elements -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		<!-- Gradient orbs -->
		<div
			class="bg-accent/10 absolute top-1/4 left-1/4 h-64 w-64 animate-pulse rounded-full blur-3xl"
		></div>
		<div
			class="absolute right-1/4 bottom-1/4 h-48 w-48 animate-pulse rounded-full bg-white/5 blur-3xl delay-1000"
		></div>
		<div
			class="bg-accent/15 absolute top-1/2 right-1/3 h-32 w-32 animate-pulse rounded-full blur-2xl delay-500"
		></div>
	</div>
</div>
