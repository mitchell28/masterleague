<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { children } = $props();
	let isMenuOpen = $state(false);
	let scrolled = $state(false);

	onMount(() => {
		const handleScroll = () => {
			scrolled = window.scrollY > 10;
		};

		window.addEventListener('scroll', handleScroll);
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}
</script>

<header
	class="fixed top-0 left-0 z-50 w-full transition-all duration-300 {scrolled
		? 'bg-black/80 py-2 shadow-md backdrop-blur-lg'
		: 'bg-transparent py-4'}"
>
	<div class="container mx-auto flex items-center justify-between px-4">
		<a href="/" class="flex items-center gap-2">
			<div
				class="silver-gradient glow-button flex size-10 items-center justify-center rounded-xl text-xl font-bold text-black"
			>
				PL
			</div>
			<span class="font-display text-gradient text-xl font-bold">Prediction League</span>
		</a>

		<!-- Desktop Navigation -->
		<nav class="hidden items-center gap-6 md:flex">
			<a
				href="/fixtures"
				class="relative px-3 py-2 text-sm font-medium {page.url.pathname === '/fixtures'
					? 'text-white after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-white'
					: 'text-slate-400 transition-colors hover:text-white'}"
			>
				Fixtures
			</a>
			<a
				href="/predictions"
				class="relative px-3 py-2 text-sm font-medium {page.url.pathname === '/predictions'
					? 'text-white after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-white'
					: 'text-slate-400 transition-colors hover:text-white'}"
			>
				Predictions
			</a>
			<a
				href="/leaderboard"
				class="relative px-3 py-2 text-sm font-medium {page.url.pathname === '/leaderboard'
					? 'text-white after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-white'
					: 'text-slate-400 transition-colors hover:text-white'}"
			>
				Leaderboard
			</a>

			{#if page.data.user?.role === 'admin'}
				<a
					href="/admin"
					class="relative px-3 py-2 text-sm font-medium {page.url.pathname.startsWith('/admin')
						? 'text-slate-200 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-slate-400'
						: 'text-slate-400 transition-colors hover:text-slate-200'}"
				>
					Admin
				</a>
			{/if}

			<div class="ml-4 flex items-center gap-2">
				{#if page.data.user}
					<a
						href="/auth/signout"
						class="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-700"
					>
						Logout
					</a>
				{:else}
					<a
						href="/auth/login"
						class="silver-gradient glow-button rounded-lg px-4 py-2 text-sm font-medium text-black shadow-md transition-all hover:shadow-lg"
					>
						Login
					</a>
				{/if}
			</div>
		</nav>

		<!-- Mobile Menu Button -->
		<button
			class="flex size-10 items-center justify-center rounded-lg bg-slate-800 text-white md:hidden"
			onclick={toggleMenu}
			aria-label="Toggle menu"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="size-6"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5'}
				/>
			</svg>
		</button>
	</div>

	<!-- Mobile Menu -->
	{#if isMenuOpen}
		<div
			class="animate-in slide-in-from-top absolute top-full left-0 w-full border-t border-slate-800 bg-black/95 shadow-lg backdrop-blur-lg md:hidden"
		>
			<nav class="container mx-auto flex flex-col gap-2 px-4 py-4">
				<a
					href="/fixtures"
					class="rounded-lg px-4 py-3 text-sm font-medium {page.url.pathname === '/fixtures'
						? 'border-l-2 border-white bg-slate-900/30 text-white'
						: 'text-slate-300 hover:bg-slate-800/50'}"
					onclick={() => (isMenuOpen = false)}
				>
					Fixtures
				</a>
				<a
					href="/predictions"
					class="rounded-lg px-4 py-3 text-sm font-medium {page.url.pathname === '/predictions'
						? 'border-l-2 border-white bg-slate-900/30 text-white'
						: 'text-slate-300 hover:bg-slate-800/50'}"
					onclick={() => (isMenuOpen = false)}
				>
					Predictions
				</a>
				<a
					href="/leaderboard"
					class="rounded-lg px-4 py-3 text-sm font-medium {page.url.pathname === '/leaderboard'
						? 'border-l-2 border-white bg-slate-900/30 text-white'
						: 'text-slate-300 hover:bg-slate-800/50'}"
					onclick={() => (isMenuOpen = false)}
				>
					Leaderboard
				</a>

				{#if page.data.user?.role === 'admin'}
					<a
						href="/admin"
						class="rounded-lg px-4 py-3 text-sm font-medium {page.url.pathname.startsWith('/admin')
							? 'border-l-2 border-slate-400 bg-slate-900/30 text-slate-200'
							: 'text-slate-300 hover:bg-slate-800/50'}"
						onclick={() => (isMenuOpen = false)}
					>
						Admin
					</a>
				{/if}

				<div class="mt-4 border-t border-slate-800 pt-4">
					{#if page.data.user}
						<a
							href="/auth/signout"
							class="block w-full rounded-lg bg-slate-800 py-3 text-center text-sm font-medium text-white"
							onclick={() => (isMenuOpen = false)}
						>
							Logout
						</a>
					{:else}
						<a
							href="/auth/login"
							class="silver-gradient glow-button block w-full rounded-lg py-3 text-center text-sm font-medium text-black"
							onclick={() => (isMenuOpen = false)}
						>
							Login
						</a>
					{/if}
				</div>
			</nav>
		</div>
	{/if}
</header>

<main class="min-h-screen pt-24 pb-16">
	{@render children()}
</main>

<footer class="border-t border-slate-800 bg-black">
	<div class="container mx-auto px-4 py-8">
		<div class="flex flex-col items-center justify-between gap-4 md:flex-row">
			<div class="flex items-center gap-2">
				<div
					class="silver-gradient glow-button flex size-8 items-center justify-center rounded-lg text-sm font-bold text-black"
				>
					PL
				</div>
				<p class="text-sm text-slate-400">Premier League Prediction Tool</p>
			</div>

			<p class="text-sm text-slate-500">&copy; {new Date().getFullYear()} All rights reserved</p>
		</div>
	</div>
</footer>
