<script lang="ts">
	import { urlFor } from '$lib/sanity/lib/image';

	interface ImageValue {
		asset: {
			_ref: string;
			_type: string;
		};
		alt?: string;
		caption?: string;
		size?: 'small' | 'medium' | 'large' | 'full';
		centered?: boolean;
		rounded?: boolean;
		hotspot?: {
			x: number;
			y: number;
			width: number;
			height: number;
		};
		crop?: {
			top: number;
			bottom: number;
			left: number;
			right: number;
		};
		[key: string]: any;
	}

	interface Props {
		value: ImageValue;
	}

	let { value }: Props = $props();

	// Different size presets
	const sizeOptions = {
		small: { width: 400, height: 300 },
		medium: { width: 600, height: 450 },
		large: { width: 800, height: 600 },
		full: { width: 1200, height: 800 }
	};

	let imageSize = $derived(value.size || 'large');
	let centered = $derived(value.centered ?? true);
	let rounded = $derived(value.rounded ?? true);

	let imageUrl = $derived(
		urlFor(value)
			.width(sizeOptions[imageSize].width)
			.height(sizeOptions[imageSize].height)
			.fit('max')
			.auto('format')
			.url()
	);
</script>

<figure class="my-8 {centered ? 'mx-auto text-center' : ''}">
	<div
		class="overflow-hidden shadow-xl {centered ? 'mx-auto' : ''} {rounded ? 'rounded-lg' : ''}"
		style="max-width: {sizeOptions[imageSize].width}px;"
	>
		<img
			src={imageUrl}
			alt={value.alt || ''}
			class="h-auto w-full object-cover transition-transform duration-300 hover:scale-105"
			loading="lazy"
		/>
	</div>

	{#if value.caption}
		<figcaption class="mt-3 text-sm text-white/60 {centered ? 'text-center' : ''}">
			{value.caption}
		</figcaption>
	{/if}
</figure>
