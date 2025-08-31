<script lang="ts">
	import { animate } from 'motion';
	import { urlFor } from '$lib/sanity/lib/image';
	import { useBlogPagination } from './hooks';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Initialize pagination hook
	const pagination = useBlogPagination(data.posts, { postsPerPage: 3 });

	let headerRef = $state<HTMLElement>();
	let postsListRef = $state<HTMLElement>();

	// Effect for animations
	$effect(() => {
		// Animate header on load
		if (headerRef) {
			animate(headerRef, { opacity: [0, 1], y: [30, 0] }, { duration: 0.8, ease: 'easeOut' });
		}
	});

	// Effect for post animations - re-run when pagination changes
	$effect(() => {
		// Trigger when currentPage or paginatedPosts change
		const currentPage = pagination.currentPage;
		const posts = pagination.paginatedPosts;

		// Animate post cards with staggered delay
		if (postsListRef && posts.length > 0) {
			const cards = postsListRef.querySelectorAll('.post-card');
			cards.forEach((card, index) => {
				// Reset opacity first
				(card as HTMLElement).style.opacity = '0';
				animate(
					card,
					{ opacity: [0, 1], y: [40, 0], scale: [0.95, 1] },
					{ duration: 0.8, delay: 0.2 + index * 0.1, ease: 'easeOut' }
				);
			});
		}
	});

	const formatDate = function (date: string) {
		return new Date(date).toLocaleDateString('en-GB', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	};
</script>

<main class="relative mx-auto mt-22 max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
	<!-- Back Button -->
	<div class="mb-8">
		<a
			href="/"
			class="text-accent hover:text-accent/80 group inline-flex items-center gap-2 transition-colors duration-200"
		>
			<svg
				class="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-1"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to Home
		</a>
	</div>

	<!-- Header Section -->
	<div bind:this={headerRef} class="mb-16 text-center opacity-0">
		<div class="mb-6">
			<span
				class="bg-accent font-display relative mb-4 inline-block px-4 pt-2 pb-1.5 text-sm font-medium text-black sm:text-base"
				style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
			>
				MASTER LEAGUE BLOG
			</span>
		</div>
		<h1 class="mb-4 text-4xl leading-tight font-bold sm:text-5xl lg:text-6xl">
			Latest Stories & Updates
		</h1>
		<p class="mx-auto max-w-2xl text-lg text-white/80 sm:text-xl">
			Explore all the latest posts, guides, and insights from the Master League community
		</p>
	</div>

	<!-- Posts List -->
	<div bind:this={postsListRef} class="grid gap-8 sm:gap-12 lg:gap-16">
		{#each pagination.paginatedPosts as post, index (post._id || index)}
			<article class="post-card opacity-0">
				<div
					class="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12 {index % 2 === 1
						? 'lg:grid-flow-col-dense'
						: ''}"
				>
					<!-- Content -->
					<div class="flex flex-col gap-4 lg:gap-6 {index % 2 === 1 ? 'lg:col-start-2' : ''}">
						<div>
							<span
								class="bg-accent font-display relative mb-4 inline-block px-3 pt-2 pb-1.5 text-xs font-medium text-black sm:px-4 sm:text-sm"
								style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
							>
								{post.category?.toUpperCase() || 'BLOG POST'}
								<span class="ml-2 text-xs opacity-75"
									>• {formatDate(post.publishedAt || post._createdAt)}</span
								>
							</span>
						</div>

						<div>
							<h2 class="mb-3 text-2xl leading-tight font-bold sm:text-3xl lg:text-4xl">
								<a
									href="/blog/{post.slug?.current}"
									class="text-primary hover:text-accent transition-colors duration-200"
								>
									{post.title || 'Untitled Post'}
								</a>
							</h2>
							<p class="mb-6 text-sm leading-relaxed text-white/70 sm:text-base">
								{post.excerpt ||
									'Read this interesting blog post about Master League and our community.'}
							</p>
						</div>

						<div>
							<a
								href="/blog/{post.slug?.current}"
								class="bg-accent hover:bg-accent/90 inline-flex items-center px-6 py-3 font-semibold text-black transition-all duration-200 hover:scale-105 hover:shadow-lg"
							>
								Read More
								<svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									></path>
								</svg>
							</a>
						</div>
					</div>

					<!-- Image -->
					<div class="flex flex-col gap-3 {index % 2 === 1 ? 'lg:col-start-1' : ''}">
						<a href="/blog/{post.slug?.current}" class="group">
							{#if post.mainImage}
								<img
									src={urlFor(post.mainImage).width(800).height(500).url()}
									alt={post.title}
									class="group-hover:shadow-3xl mx-auto h-auto w-full max-w-lg object-cover shadow-2xl transition-all duration-300 group-hover:scale-105 lg:max-w-none"
								/>
							{:else}
								<div
									class="group-hover:shadow-3xl mx-auto flex h-auto w-full max-w-lg items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl transition-all duration-300 group-hover:scale-105 lg:max-w-none"
									style="aspect-ratio: 4/3;"
								>
									<div class="text-6xl text-slate-400">📝</div>
								</div>
							{/if}
						</a>
					</div>
				</div>

				<!-- Divider (except for last post) -->
				{#if index < pagination.paginatedPosts.length - 1}
					<div class="mt-12 border-t border-white/10 pt-0 sm:mt-16"></div>
				{/if}
			</article>
		{/each}
	</div>

	<!-- Pagination -->
	<div class="mt-16 flex items-center justify-center gap-4 sm:mt-20">
		{#if pagination.totalPages > 1}
			{#if pagination.hasPrevPage}
				<button
					onclick={() => pagination.goToPrevPage()}
					class="bg-accent hover:bg-accent/90 inline-flex items-center px-6 py-3 font-semibold text-black transition-all duration-200 hover:scale-105 hover:shadow-lg"
					style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
				>
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						></path>
					</svg>
					Previous
				</button>
			{/if}

			<div class="flex items-center gap-2">
				{#each Array(pagination.totalPages) as _, i}
					{@const pageNum = i + 1}
					<button
						onclick={() => pagination.goToPage(pageNum)}
						class="flex h-10 w-10 items-center justify-center text-sm font-medium transition-all duration-200 {pageNum ===
						pagination.currentPage
							? 'bg-accent text-black'
							: 'bg-white/10 text-white hover:bg-white/20'}"
					>
						{pageNum}
					</button>
				{/each}
			</div>

			{#if pagination.hasNextPage}
				<button
					onclick={() => pagination.goToNextPage()}
					class="bg-accent hover:bg-accent/90 inline-flex items-center px-6 py-3 font-semibold text-black transition-all duration-200 hover:scale-105 hover:shadow-lg"
					style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
				>
					Next
					<svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
						></path>
					</svg>
				</button>
			{/if}
		{/if}
	</div>

	<!-- Page Info -->
	<div class="mt-8 text-center">
		<p class="text-sm text-white/60">
			Showing page {pagination.currentPage} of {pagination.totalPages}
			({pagination.totalPosts} total posts)
		</p>
	</div>

	<!-- Call to Action -->
	<div class="mt-16 text-center sm:mt-20">
		<div class=" bg-white/5 p-8 sm:p-12">
			<h3 class="mb-4 text-2xl font-bold sm:text-3xl">Ready to Join Master League?</h3>
			<p class="mx-auto mb-6 max-w-lg text-white/80">
				Get started with Master League today and compete with friends in the ultimate football
				prediction platform.
			</p>
			<a
				href="/auth/signup"
				style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
				class="bg-accent hover:bg-accent/90 inline-flex items-center px-8 py-4 text-lg font-semibold text-black transition-all duration-200 hover:scale-105 hover:shadow-lg"
			>
				Sign Up Now
			</a>
		</div>
	</div>

	<!-- Decorative Elements -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		<!-- Gradient orbs -->
		<div
			class="bg-accent/5 absolute top-1/4 left-1/4 h-64 w-64 animate-pulse rounded-full blur-3xl"
		></div>
		<div
			class="absolute right-1/4 bottom-1/4 h-48 w-48 animate-pulse rounded-full bg-white/5 blur-3xl delay-1000"
		></div>
	</div>
</main>
