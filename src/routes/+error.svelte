<script lang="ts">
	import { page } from '$app/state';
	import { ChevronLeft, AlertCircle, Home } from '@lucide/svelte';
	import { fade } from 'svelte/transition';
</script>

<div
	in:fade={{ duration: 200, delay: 150 }}
	class="container mx-auto flex min-h-[75vh] flex-col items-center justify-center px-4 py-16 text-center"
>
	<div
		class="mb-6 flex size-20 items-center justify-center rounded-full bg-rose-600/20 text-rose-500"
	>
		<AlertCircle size={36} />
	</div>

	<h1 class="text-gradient font-display mb-2 text-4xl font-bold md:text-5xl">
		{page.status} Error
	</h1>

	<p class="mb-8 max-w-lg text-lg text-slate-400">
		{page.error?.message || 'Something went wrong. Please try again later.'}
	</p>

	<div class="flex flex-col gap-4 sm:flex-row">
		<a
			href="/"
			class="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:translate-y-[-2px] hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-500/20"
		>
			<Home size={18} />
			Go Home
		</a>

		<button
			on:click={() => history.back()}
			class="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-6 py-3 font-medium text-white transition-all hover:translate-y-[-2px] hover:bg-slate-700 hover:shadow-lg"
		>
			<ChevronLeft size={18} />
			Go Back
		</button>
	</div>

	{#if import.meta.env.DEV && page.error}
		<div
			class="mt-12 w-full max-w-2xl overflow-hidden rounded-lg border border-rose-500/20 bg-black/50 p-4 text-left"
		>
			<h3 class="mb-2 font-medium text-rose-400">Developer Error Details:</h3>
			<pre class="overflow-x-auto text-xs text-slate-300">{JSON.stringify(
					page.error,
					null,
					2
				)}</pre>
		</div>
	{/if}
</div>
