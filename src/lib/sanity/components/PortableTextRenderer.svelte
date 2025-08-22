<script lang="ts">
	import { PortableText } from '@portabletext/svelte';
	import type { PortableTextBlock } from '@portabletext/types';

	export let content: PortableTextBlock[];

	// Basic components only - no custom block types
	const components = {};
</script>

<div class="prose prose-invert max-w-none">
	<PortableText value={content} {components} />
</div>
