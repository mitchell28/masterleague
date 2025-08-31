<script lang="ts">
	import { PortableText } from '@portabletext/svelte';
	import type { PortableTextBlock } from '@portabletext/types';
	import Image from './portabletext/Image.svelte';
	import Link from './portabletext/Link.svelte';

	export let content: PortableTextBlock[];

	// Custom components for portable text
	const components = {
		types: {
			image: Image
		},
		marks: {
			link: Link
		}
	};
</script>

<div class="prose prose-invert max-w-none">
	<PortableText value={content} {components} />
</div>

<!-- Temporarily commented out due to TailwindCSS v4 compatibility issues
<style>
	@reference "../../../app.css";
	.prose :global(h1) {
		@apply mb-6 text-4xl font-black text-white;
	}
	.prose :global(h2) {
		@apply mb-5 text-3xl font-bold text-white;
	}
	.prose :global(h3) {
		@apply mb-4 text-2xl font-bold text-white;
	}
	.prose :global(h4) {
		@apply mb-3 text-xl font-bold text-white;
	}
	.prose :global(h5) {
		@apply mb-3 text-lg font-bold text-white;
	}
	.prose :global(h6) {
		@apply mb-2 text-base font-bold text-white;
	}
	.prose :global(p) {
		@apply mb-4 leading-relaxed text-gray-200;
	}
	.prose :global(blockquote) {
		@apply border-accent my-6 border-l-4 pl-6 text-gray-300 italic;
	}
	.prose :global(ul) {
		@apply mb-4 list-inside list-disc space-y-2 text-gray-200;
	}
	.prose :global(ol) {
		@apply mb-4 list-inside list-decimal space-y-2 text-gray-200;
	}
	.prose :global(li) {
		@apply ml-4;
	}
	.prose :global(strong) {
		@apply font-bold text-white;
	}
	.prose :global(em) {
		@apply italic;
	}
	.prose :global(code) {
		@apply text-accent rounded bg-gray-800 px-2 py-1 font-mono text-sm;
	}
</style>
-->
