<script lang="ts">
	import { urlFor } from '$lib/sanity/lib/image';
	import type { Image } from '@sanity/types';

	interface ImageProps {
		portableText: {
			value: {
				asset: Image;
				alt?: string;
				caption?: string;
				size?: 'small' | 'medium' | 'large' | 'full' | 'custom';
				customWidth?: number;
				alignment?: 'start' | 'center' | 'end';
				hotspot?: {
					x: number;
					y: number;
				};
				crop?: {
					top: number;
					bottom: number;
					left: number;
					right: number;
				};
			};
		};
	}

	let { portableText }: ImageProps = $props();
	let value = $derived(portableText.value);
	let size = $derived(value.size || 'large');
	let alignment = $derived(value.alignment || 'center');

	// Size configurations - derive to handle custom width reactively
	let sizeConfig = $derived({
		small: { mobile: 300, desktop: 400, maxWidth: 'max-w-sm' },
		medium: { mobile: 400, desktop: 600, maxWidth: 'max-w-2xl' },
		large: { mobile: 500, desktop: 800, maxWidth: 'max-w-4xl' },
		full: { mobile: 600, desktop: 1200, maxWidth: 'max-w-full' },
		custom: {
			mobile: Math.min(value.customWidth || 400, 600),
			desktop: value.customWidth || 400,
			maxWidth: `max-w-[${value.customWidth || 400}px]`
		}
	});

	let config = $derived(sizeConfig[size as keyof typeof sizeConfig]);

	// Alignment classes
	const alignmentClasses: Record<string, string> = {
		start: 'ml-0 mr-auto',
		center: 'mx-auto',
		end: 'ml-auto mr-0'
	};

	// Generate optimized image URLs with size-based dimensions
	const mobileImageUrl = $derived(
		urlFor(value.asset).width(config.mobile).fit('max').auto('format').quality(80).url()
	);

	const desktopImageUrl = $derived(
		urlFor(value.asset).width(config.desktop).fit('max').auto('format').quality(80).url()
	);

	const fallbackImageUrl = $derived(
		urlFor(value.asset)
			.width(Math.floor((config.mobile + config.desktop) / 2))
			.fit('max')
			.auto('format')
			.quality(80)
			.url()
	);
</script>

<figure class="my-8 {config.maxWidth} {alignmentClasses[alignment]}">
	<picture>
		<!-- Mobile version -->
		<source media="(max-width: 768px)" srcset={mobileImageUrl} />
		<!-- Desktop version -->
		<source media="(min-width: 769px)" srcset={desktopImageUrl} />
		<!-- Fallback -->
		<img
			src={fallbackImageUrl}
			alt={value.alt || ''}
			class="h-auto w-full"
			loading="lazy"
			decoding="async"
		/>
	</picture>
	{#if value.caption}
		<figcaption class="mt-3 text-center text-sm text-gray-400 italic">
			{value.caption}
		</figcaption>
	{/if}
</figure>
