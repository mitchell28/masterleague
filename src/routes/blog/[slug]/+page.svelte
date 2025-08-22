<script lang="ts">
	import { useQuery } from '@sanity/svelte-loader';
	import { urlFor } from '$lib/sanity/lib/image';
	import { animate } from 'motion';
	import PortableTextRenderer from '$lib/sanity/components/PortableTextRenderer.svelte';
	import type { Post } from '$lib/sanity/lib/queries';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const formatDate = function (date: string) {
		return new Date(date).toLocaleDateString('en-GB', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	};

	const q = useQuery<Post>(data);

	let post = $derived($q.data);

	let announcementRef = $state<HTMLElement>();
	let titleRef = $state<HTMLElement>();
	let imageRef = $state<HTMLElement>();

	// Effect for animations
	$effect(() => {
		// Animate elements on load
		if (announcementRef) {
			animate(
				announcementRef,
				{ opacity: [0, 1], y: [-20, 0], scale: [0.95, 1] },
				{ duration: 0.8, ease: 'easeOut' }
			);
		}

		if (titleRef) {
			animate(
				titleRef,
				{ opacity: [0, 1], y: [30, 0] },
				{ duration: 0.8, delay: 0.2, ease: 'easeOut' }
			);
		}

		if (imageRef) {
			animate(
				imageRef,
				{ opacity: [0, 1], x: [30, 0], scale: [0.9, 1] },
				{ duration: 1, delay: 0.4, ease: 'easeOut' }
			);
		}
	});
</script>

<main class="mx-auto mt-22 flex max-w-7xl px-4 sm:px-6 lg:px-10">
	<article class="w-full py-8 sm:pt-12">
		<!-- Back Button -->
		<div class="mb-8">
			<a
				href="/blog"
				class="text-accent hover:text-accent/80 group inline-flex items-center gap-2 transition-colors duration-200"
			>
				<svg
					class="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-1"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
				Back to Blog
			</a>
		</div>

		<div class="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
			<div class="flex flex-col gap-4 lg:gap-6">
				<div bind:this={announcementRef} class="opacity-0">
					<span
						class="bg-accent font-display relative mb-4 flex w-fit items-center gap-2 px-3 pt-2 pb-1.5 text-sm font-medium text-black sm:px-4 sm:text-base"
						style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
					>
						{post?.category?.toUpperCase() || 'BLOG POST'}
						<span class="text-xs opacity-75"
							>• {formatDate(
								post?.publishedAt || post?._createdAt || new Date().toISOString()
							)}</span
						>
					</span>
				</div>
				<div bind:this={titleRef} class="opacity-0">
					<h1 class="mb-3 text-3xl leading-tight font-bold sm:mb-4 sm:text-4xl lg:text-5xl">
						{post?.title || 'Blog Post Title'}
					</h1>
					{#if post?.excerpt}
						<p class="mb-2 text-lg text-white/80 sm:text-xl">
							{post.excerpt}
						</p>
					{/if}
				</div>
			</div>

			<div bind:this={imageRef} class="flex flex-col gap-3 opacity-0">
				{#if post?.mainImage}
					<img
						src={urlFor(post.mainImage).width(800).height(600).url()}
						alt={post?.title}
						class="mx-auto h-auto w-full max-w-lg rounded-lg object-cover shadow-2xl transition-transform duration-300 hover:scale-105 lg:max-w-none"
					/>
				{:else}
					<div
						class="mx-auto flex h-auto w-full max-w-lg items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl transition-transform duration-300 hover:scale-105 lg:max-w-none"
						style="aspect-ratio: 4/3;"
					>
						<div class="text-6xl text-slate-400">📝</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Full Article Content -->
		<div class="mx-auto mt-12 max-w-4xl sm:mt-16 lg:mt-20">
			{#if post?.body}
				<PortableTextRenderer content={post.body} />

				<!-- CTA Section (when there is body content) -->
				{#if post?.showCTA !== false}
					<div class="prose prose-lg prose-invert mt-12 max-w-none">
						<div class="bg-accent/10 border-accent mt-6 border-l-4 p-4 text-center sm:mt-8 sm:p-6">
							<p class="mb-4 text-lg font-bold sm:text-xl">Ready to Get Started?</p>
							<a
								href="/auth/signup"
								style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
								class="bg-accent hover:bg-accent/90 inline-flex items-center px-6 py-3 font-semibold text-black transition-all duration-200 hover:scale-105 hover:shadow-lg"
							>
								Join Master League
							</a>
						</div>
					</div>
				{/if}
			{:else}
				<div class="prose prose-lg prose-invert max-w-none">
					<p class="text-accent mb-6 text-lg leading-relaxed font-medium sm:mb-8 sm:text-xl">
						Thank you for reading this blog post! We hope you found it informative and engaging.
					</p>

					<h2 class="text-primary mb-3 text-xl font-bold sm:mb-4 sm:text-2xl">What's Next?</h2>
					<p class="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
						Stay tuned for more updates and insights from our team. We regularly publish new content
						covering various topics related to our platform and community.
					</p>

					<h2 class="text-primary mb-3 text-xl font-bold sm:mb-4 sm:text-2xl">Get Involved</h2>
					<p class="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
						Join our community and be part of the conversation. Connect with other users, share your
						experiences, and stay updated with the latest developments.
					</p>

					<!-- CTA Section (fallback content) -->
					{#if post?.showCTA !== false}
						<div class="bg-accent/10 border-accent mt-6 border-l-4 p-4 text-center sm:mt-8 sm:p-6">
							<p class="mb-4 text-lg font-bold sm:text-xl">Ready to Get Started?</p>
							<a
								href="/auth/signup"
								style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
								class="bg-accent hover:bg-accent/90 inline-flex items-center px-6 py-3 font-semibold text-black transition-all duration-200 hover:scale-105 hover:shadow-lg"
							>
								Join Master League
							</a>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</article>
</main>
