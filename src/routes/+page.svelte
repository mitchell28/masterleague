<script lang="ts">
	import {
		AlertTriangle,
		CheckCircle,
		Heart,
		Award,
		Check,
		ArrowUpCircle,
		Trophy,
		Target,
		Users
	} from '@lucide/svelte';
	import logo from '$lib/assets/logo/master_league_logo.png';

	let initialized = $state(false);
	let loading = $state(true);
	let error = $state('');
	let activeTab = $state('how-it-works');

	// Get initialized data from the server
	let { data } = $props();
	let initializedData = $derived(data.initialized);

	$effect(() => {
		try {
			// Use the server-loaded initialization data
			if (initializedData.success) {
				initialized = true;
			} else {
				error = initializedData.message || 'Failed to initialize the database';
			}
		} catch (err) {
			error = 'An error occurred while initializing the database';
			console.error(err);
		} finally {
			loading = false;
		}
	});
</script>

<div class="relative min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
	<!-- Hero Section -->
	<section class="container mx-auto px-4 py-20 md:py-28">
		<div class="mx-auto max-w-6xl text-center">
			<div class="mb-8 flex justify-center">
				<img src={logo} alt="Master League Logo" class="drop-shadow-glow h-28 md:h-36" />
			</div>
			<h1 class="font-display mb-8 text-5xl font-bold md:text-7xl">
				<span
					class="bg-gradient-to-r from-white via-blue-100 to-slate-200 bg-clip-text text-transparent"
					>Master League</span
				>
			</h1>
			<p class="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-slate-300 md:text-xl">
				Predict match scores, compete with friends, and climb the leaderboard in this AI-powered
				Premier League prediction platform.
			</p>

			{#if loading}
				<div
					class="glass-panel mb-12 flex items-center justify-center rounded-3xl p-8 backdrop-blur-md"
				>
					<div class="flex flex-col items-center gap-4">
						<div
							class="h-8 w-8 animate-spin rounded-full border-4 border-slate-400 border-t-white"
						></div>
						<p class="text-slate-300">Initializing application...</p>
					</div>
				</div>
			{:else if error}
				<div
					class="glass-panel mb-12 rounded-3xl border-l-4 border-red-500 p-8 shadow-lg backdrop-blur-md"
				>
					<div class="flex items-start gap-5">
						<div
							class="flex size-12 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400"
						>
							<AlertTriangle class="size-7" />
						</div>
						<div>
							<h3 class="mb-2 text-xl font-medium text-red-400">Initialization Error</h3>
							<p class="text-slate-300">{error}</p>
						</div>
					</div>
				</div>
			{:else}
				<div
					class="glass-panel mb-12 rounded-3xl border-l-4 border-green-500 p-8 shadow-lg backdrop-blur-md"
				>
					<div class="flex items-center justify-center gap-5">
						<div class="flex flex-col items-center gap-3">
							<div
								class="flex size-14 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-400"
							>
								<CheckCircle class="size-8" />
							</div>
							<h3 class="mb-1 text-xl font-medium text-green-400">Ready to Play</h3>
							<p class="text-slate-300">
								Application initialized successfully! You can now start making predictions.
							</p>
						</div>
					</div>
				</div>
			{/if}

			<div class="flex flex-wrap justify-center gap-5">
				<a
					href="/predictions"
					class="silver-gradient glow-button rounded-xl px-8 py-4 font-medium text-black shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
				>
					Make Predictions
				</a>
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="container mx-auto px-4 py-20">
		<div class="mx-auto max-w-6xl">
			<!-- Tabs -->
			<div class="mb-12 flex flex-wrap justify-center gap-3">
				<button
					class="{activeTab === 'how-it-works'
						? 'border-white bg-slate-800/50 text-white shadow-lg'
						: 'border-transparent bg-slate-900/40 text-slate-400 hover:bg-slate-800/40 hover:text-slate-300'} cursor-pointer rounded-xl border px-6 py-3 text-sm font-medium transition-all"
					onclick={() => (activeTab = 'how-it-works')}
				>
					How It Works
				</button>
				<button
					class="{activeTab === 'match-types'
						? 'border-white bg-slate-800/50 text-white shadow-lg'
						: 'border-transparent bg-slate-900/40 text-slate-400 hover:bg-slate-800/40 hover:text-slate-300'} cursor-pointer rounded-xl border px-6 py-3 text-sm font-medium transition-all"
					onclick={() => (activeTab = 'match-types')}
				>
					Match Types
				</button>
				<button
					class="{activeTab === 'scoring-system'
						? 'border-white bg-slate-800/50 text-white shadow-lg'
						: 'border-transparent bg-slate-900/40 text-slate-400 hover:bg-slate-800/40 hover:text-slate-300'} cursor-pointer rounded-xl border px-6 py-3 text-sm font-medium transition-all"
					onclick={() => (activeTab = 'scoring-system')}
				>
					Scoring System
				</button>
			</div>

			<!-- Tab Content -->
			<div class="glass-card glow-subtle rounded-3xl p-10 shadow-2xl backdrop-blur-md">
				{#if activeTab === 'how-it-works'}
					<div class="mx-auto max-w-3xl text-center">
						<div
							class="silver-gradient glow-button mx-auto mb-8 flex size-20 items-center justify-center rounded-full shadow-lg"
						>
							<Trophy class="size-10 text-black" />
						</div>
						<h2 class="font-display text-gradient mb-6 text-3xl font-bold">How It Works</h2>
						<p class="mb-10 text-lg leading-relaxed text-slate-300">
							This tool allows you to predict the scores of Premier League matches and compete with
							friends and family. Each week, we generate 5 interesting fixtures for you to predict.
						</p>
						<div class="grid gap-6 text-left md:grid-cols-3">
							<div
								class="rounded-xl border border-slate-700/30 bg-slate-800/30 p-6 shadow-lg transition-all hover:bg-slate-800/40 hover:shadow-xl"
							>
								<div
									class="mb-4 flex size-12 items-center justify-center rounded-full bg-blue-500/20 text-blue-400"
								>
									<Users class="size-6" />
								</div>
								<h3 class="mb-3 text-lg font-medium text-white">Sign Up</h3>
								<p class="text-slate-400">
									Create an account to start tracking your predictions and standings
								</p>
							</div>
							<div
								class="rounded-xl border border-slate-700/30 bg-slate-800/30 p-6 shadow-lg transition-all hover:bg-slate-800/40 hover:shadow-xl"
							>
								<div
									class="mb-4 flex size-12 items-center justify-center rounded-full bg-purple-500/20 text-purple-400"
								>
									<Target class="size-6" />
								</div>
								<h3 class="mb-3 text-lg font-medium text-white">Make Predictions</h3>
								<p class="text-slate-400">
									Submit your score predictions for each fixture before the deadline
								</p>
							</div>
							<div
								class="rounded-xl border border-slate-700/30 bg-slate-800/30 p-6 shadow-lg transition-all hover:bg-slate-800/40 hover:shadow-xl"
							>
								<div
									class="mb-4 flex size-12 items-center justify-center rounded-full bg-green-500/20 text-green-400"
								>
									<Trophy class="size-6" />
								</div>
								<h3 class="mb-3 text-lg font-medium text-white">Earn Points</h3>
								<p class="text-slate-400">
									Get points for correct predictions and climb the leaderboard
								</p>
							</div>
						</div>
					</div>
				{:else if activeTab === 'match-types'}
					<div class="mx-auto max-w-3xl text-center">
						<div
							class="silver-gradient glow-button mx-auto mb-8 flex size-20 items-center justify-center rounded-full shadow-lg"
						>
							<Award class="size-10 text-black" />
						</div>
						<h2 class="font-display text-gradient mb-6 text-3xl font-bold">Match Types</h2>
						<p class="mb-10 text-lg leading-relaxed text-slate-300">
							Each week features a variety of match types with different point values to make the
							competition more exciting.
						</p>
						<div class="space-y-6">
							<div
								class="rounded-xl border border-slate-700/30 bg-slate-800/20 p-6 shadow-lg transition-all hover:bg-slate-800/30"
							>
								<div class="mb-3 flex items-center gap-4">
									<span
										class="rounded-full bg-red-500/20 px-4 py-1.5 text-sm font-medium text-red-400"
										>Triple Points</span
									>
									<h3 class="text-xl font-medium text-white">Derby Match</h3>
								</div>
								<p class="text-slate-400">
									One big derby match worth 3x points - these are usually rivalry matches with high
									stakes
								</p>
							</div>
							<div
								class="rounded-xl border border-slate-700/30 bg-slate-800/20 p-6 shadow-lg transition-all hover:bg-slate-800/30"
							>
								<div class="mb-3 flex items-center gap-4">
									<span
										class="rounded-full bg-yellow-500/20 px-4 py-1.5 text-sm font-medium text-yellow-400"
										>Double Points</span
									>
									<h3 class="text-xl font-medium text-white">Exciting Match</h3>
								</div>
								<p class="text-slate-400">
									One exciting match worth 2x points - typically features top teams or has
									significant table implications
								</p>
							</div>
							<div
								class="rounded-xl border border-slate-700/30 bg-slate-800/20 p-6 shadow-lg transition-all hover:bg-slate-800/30"
							>
								<div class="mb-3 flex items-center gap-4">
									<span
										class="rounded-full bg-blue-500/20 px-4 py-1.5 text-sm font-medium text-blue-400"
										>Regular Points</span
									>
									<h3 class="text-xl font-medium text-white">Standard Matches</h3>
								</div>
								<p class="text-slate-400">
									Three standard matches worth normal points - these include a variety of teams from
									the Premier League
								</p>
							</div>
						</div>
					</div>
				{:else if activeTab === 'scoring-system'}
					<div class="mx-auto max-w-3xl text-center">
						<div
							class="silver-gradient glow-button mx-auto mb-8 flex size-20 items-center justify-center rounded-full shadow-lg"
						>
							<Check class="size-10 text-black" />
						</div>
						<h2 class="font-display text-gradient mb-6 text-3xl font-bold">Scoring System</h2>
						<p class="mb-10 text-lg leading-relaxed text-slate-300">
							Points are awarded based on the accuracy of your predictions. The more accurate your
							prediction, the more points you earn.
						</p>
						<div class="grid gap-8 md:grid-cols-2">
							<div
								class="rounded-xl border border-slate-700/30 bg-slate-800/20 p-7 shadow-lg transition-all hover:bg-slate-800/30"
							>
								<div
									class="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-500/20 text-green-400"
								>
									<Check class="size-8" />
								</div>
								<h3 class="mb-3 text-xl font-medium text-green-400">Correct Scoreline</h3>
								<p class="mb-4 text-2xl font-bold text-white">3 points</p>
								<div class="rounded-lg bg-slate-800/50 p-4">
									<p class="text-slate-400">Example: You predict 2-1, and the final score is 2-1</p>
								</div>
							</div>
							<div
								class="rounded-xl border border-slate-700/30 bg-slate-800/20 p-7 shadow-lg transition-all hover:bg-slate-800/30"
							>
								<div
									class="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400"
								>
									<ArrowUpCircle class="size-8" />
								</div>
								<h3 class="mb-3 text-xl font-medium text-yellow-400">Correct Outcome</h3>
								<p class="mb-4 text-2xl font-bold text-white">1 point</p>
								<div class="rounded-lg bg-slate-800/50 p-4">
									<p class="text-slate-400">
										Example: You predict 2-1 (home win), and the final score is 3-0 (still a home
										win)
									</p>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</section>
</div>
