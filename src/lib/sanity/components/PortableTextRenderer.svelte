<script lang="ts">
	import { PortableText } from '@portabletext/svelte';
	import ImageBlock from './ImageBlock.svelte';
	import CalloutBlock from './CalloutBlock.svelte';
	import CodeBlock from './CodeBlock.svelte';
	import YouTubeBlock from './YouTubeBlock.svelte';
	import TableBlock from './TableBlock.svelte';
	import type { PortableTextBlock } from '@portabletext/types';

	export let content: PortableTextBlock[];

	// Custom components for different block types
	const components = {
		types: {
			// Use our custom components
			callout: CalloutBlock,
			codeBlock: CodeBlock,
			image: ImageBlock,
			youtube: YouTubeBlock,
			table: TableBlock
		}
	};
</script>

<div class="prose prose-invert max-w-none">
	<PortableText value={content} {components} />
</div>
