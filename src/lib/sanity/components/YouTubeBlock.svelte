<script lang="ts">
	let {
		value
	}: {
		value: {
			url: string;
			title?: string;
		};
	} = $props();

	let videoId = $derived(() => {
		const match = value.url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
		return match?.[1] || null;
	});
</script>

{#if videoId}
	<div class="youtube-embed my-8">
		<div
			class="relative h-0 overflow-hidden rounded-lg border border-purple-500/20 pb-[56.25%] shadow-2xl"
		>
			<iframe
				src="https://www.youtube.com/embed/{videoId}"
				title={value.title || 'YouTube video'}
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen
				class="absolute top-0 left-0 h-full w-full"
			></iframe>
		</div>
		{#if value.title}
			<p class="mt-2 text-center text-gray-400 italic">{value.title}</p>
		{/if}
	</div>
{:else}
	<div class="my-4 rounded-lg border border-red-500/30 bg-red-900/20 p-4">
		<p class="text-red-400">Invalid YouTube URL: {value.url}</p>
	</div>
{/if}

<style>
	.youtube-embed {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(219, 39, 119, 0.1) 100%);
		border-radius: 12px;
		padding: 1rem;
	}
</style>
