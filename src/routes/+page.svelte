<script lang="ts">
	import { AlertTriangle, CheckCircle, Heart, Award, Check, ArrowUpCircle } from '@lucide/svelte';

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

<div class="relative">
	<!-- Hero Section -->
	<section class="container mx-auto px-4 py-16 md:py-24">
		<div class="mx-auto max-w-6xl text-center">
			<h1 class="font-display mb-6 text-4xl font-bold md:text-6xl">
				<span class="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent"
					>Master League</span
				>
			</h1>
			<p class="mx-auto mb-10 max-w-2xl text-lg text-slate-300 md:text-xl">
				Predict match scores, compete with friends, and climb the leaderboard in this AI-powered
				Premier League prediction platform.
			</p>

			{#if loading}
				<div class="glass-panel mb-10 flex items-center justify-center rounded-2xl p-6">
					<div class="flex flex-col items-center gap-4">
						<p class="text-slate-300">Initializing application...</p>
					</div>
				</div>
			{:else if error}
				<div class="glass-panel mb-10 rounded-2xl border-l-4 border-red-500 p-6">
					<div class="flex items-start gap-4">
						<div
							class="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-500"
						>
							<AlertTriangle class="size-6" />
						</div>
						<div>
							<h3 class="mb-1 text-lg font-medium text-red-400">Initialization Error</h3>
							<p class="text-slate-300">{error}</p>
						</div>
					</div>
				</div>
			{:else}
				<div class="glass-panel mb-10 rounded-2xl border-l-4 border-green-500 p-6">
					<div class="flex items-center justify-center gap-4">
						<div class="flex flex-col items-center gap-2">
							<h3 class="mb-1 text-lg font-medium text-green-400">Ready to Play</h3>
							<p class="text-slate-300">
								Application initialized successfully! You can now start making predictions.
							</p>
							<div
								class="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-500"
							>
								<CheckCircle class="size-6" />
							</div>
						</div>
					</div>
				</div>
			{/if}

			<div class="flex flex-wrap justify-center gap-4">
				<a
					href="/predictions"
					class="silver-gradient glow-button rounded-xl px-6 py-3 font-medium text-black shadow-md transition-all hover:shadow-lg"
				>
					Make Predictions
				</a>
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="container mx-auto px-4 py-16">
		<div class="mx-auto max-w-6xl">
			<!-- Tabs -->
			<div class="mb-10 flex flex-wrap justify-center gap-2">
				<button
					class="{activeTab === 'how-it-works'
						? 'border-white bg-slate-900/30 text-white'
						: 'border-transparent bg-slate-900/30 text-slate-400 hover:bg-slate-800/30 hover:text-slate-300'} cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-all"
					onclick={() => (activeTab = 'how-it-works')}
				>
					How It Works
				</button>
				<button
					class="{activeTab === 'match-types'
						? 'border-white bg-slate-900/30 text-white'
						: 'border-transparent bg-slate-900/30 text-slate-400 hover:bg-slate-800/30 hover:text-slate-300'} cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-all"
					onclick={() => (activeTab = 'match-types')}
				>
					Match Types
				</button>
				<button
					class="{activeTab === 'scoring-system'
						? 'border-white bg-slate-900/30 text-white'
						: 'border-transparent bg-slate-900/30 text-slate-400 hover:bg-slate-800/30 hover:text-slate-300'} cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-all"
					onclick={() => (activeTab = 'scoring-system')}
				>
					Scoring System
				</button>
			</div>

			<!-- Tab Content -->
			<div class="glass-card glow-subtle rounded-2xl p-8">
				{#if activeTab === 'how-it-works'}
					<div class="mx-auto max-w-3xl text-center">
						<div
							class="silver-gradient glow-button mx-auto mb-6 flex size-16 items-center justify-center rounded-full"
						>
							<Heart class="size-8 text-black" />
						</div>
						<h2 class="font-display text-gradient mb-4 text-2xl font-bold">How It Works</h2>
						<p class="mb-6 text-slate-300">
							This tool allows you to predict the scores of Premier League matches and compete with
							friends and family. Each week, we generate 5 interesting fixtures for you to predict.
						</p>
						<div class="grid gap-6 text-left md:grid-cols-3">
							<div class="rounded-xl border border-slate-700/30 bg-slate-800/30 p-4">
								<div
									class="mb-3 flex size-10 items-center justify-center rounded-full bg-slate-900/50 text-white"
								>
									1
								</div>
								<h3 class="mb-2 font-medium text-white">Sign Up</h3>
								<p class="text-sm text-slate-400">
									Create an account to start tracking your predictions and standings
								</p>
							</div>
							<div class="rounded-xl border border-slate-700/30 bg-slate-800/30 p-4">
								<div
									class="mb-3 flex size-10 items-center justify-center rounded-full bg-slate-900/50 text-white"
								>
									2
								</div>
								<h3 class="mb-2 font-medium text-white">Make Predictions</h3>
								<p class="text-sm text-slate-400">
									Submit your score predictions for each fixture before the deadline
								</p>
							</div>
							<div class="rounded-xl border border-slate-700/30 bg-slate-800/30 p-4">
								<div
									class="mb-3 flex size-10 items-center justify-center rounded-full bg-slate-900/50 text-white"
								>
									3
								</div>
								<h3 class="mb-2 font-medium text-white">Earn Points</h3>
								<p class="text-sm text-slate-400">
									Get points for correct predictions and climb the leaderboard
								</p>
							</div>
						</div>
					</div>
				{:else if activeTab === 'match-types'}
					<div class="mx-auto max-w-3xl text-center">
						<div
							class="silver-gradient glow-button mx-auto mb-6 flex size-16 items-center justify-center rounded-full"
						>
							<Award class="size-8 text-black" />
						</div>
						<h2 class="font-display text-gradient mb-4 text-2xl font-bold">Match Types</h2>
						<p class="mb-6 text-slate-300">
							Each week features a variety of match types with different point values to make the
							competition more exciting.
						</p>
						<div class="space-y-4">
							<div class="rounded-xl border border-slate-700/30 bg-slate-800/20 p-4">
								<div class="mb-2 flex items-center gap-3">
									<span
										class="rounded-full bg-slate-700/30 px-3 py-1 text-xs font-medium text-white"
										>Triple Points</span
									>
									<h3 class="font-medium text-white">Derby Match</h3>
								</div>
								<p class="text-sm text-slate-400">
									One big derby match worth 3x points - these are usually rivalry matches with high
									stakes
								</p>
							</div>
							<div class="rounded-xl border border-slate-700/30 bg-slate-800/20 p-4">
								<div class="mb-2 flex items-center gap-3">
									<span
										class="rounded-full bg-slate-700/30 px-3 py-1 text-xs font-medium text-white"
										>Double Points</span
									>
									<h3 class="font-medium text-white">Exciting Match</h3>
								</div>
								<p class="text-sm text-slate-400">
									One exciting match worth 2x points - typically features top teams or has
									significant table implications
								</p>
							</div>
							<div class="rounded-xl border border-slate-700/30 bg-slate-800/20 p-4">
								<div class="mb-2 flex items-center gap-3">
									<span
										class="rounded-full bg-slate-700/30 px-3 py-1 text-xs font-medium text-white"
										>Regular Points</span
									>
									<h3 class="font-medium text-white">Standard Matches</h3>
								</div>
								<p class="text-sm text-slate-400">
									Three standard matches worth normal points - these include a variety of teams from
									the Premier League
								</p>
							</div>
						</div>
					</div>
				{:else if activeTab === 'scoring-system'}
					<div class="mx-auto max-w-3xl text-center">
						<div
							class="silver-gradient glow-button mx-auto mb-6 flex size-16 items-center justify-center rounded-full"
						>
							<Check class="size-8 text-black" />
						</div>
						<h2 class="font-display text-gradient mb-4 text-2xl font-bold">Scoring System</h2>
						<p class="mb-6 text-slate-300">
							Points are awarded based on the accuracy of your predictions. The more accurate your
							prediction, the more points you earn.
						</p>
						<div class="grid gap-6 md:grid-cols-2">
							<div class="rounded-xl border border-slate-700/30 bg-slate-800/20 p-5">
								<div
									class="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-green-500/20 text-green-400"
								>
									<Check class="size-6" />
								</div>
								<h3 class="mb-2 font-medium text-green-400">Correct Scoreline</h3>
								<p class="mb-3 text-sm text-slate-300">3 points</p>
								<div class="rounded-lg bg-slate-800/50 p-3">
									<p class="text-xs text-slate-400">
										Example: You predict 2-1, and the final score is 2-1
									</p>
								</div>
							</div>
							<div class="rounded-xl border border-slate-700/30 bg-slate-800/20 p-5">
								<div
									class="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400"
								>
									<ArrowUpCircle class="size-6" />
								</div>
								<h3 class="mb-2 font-medium text-yellow-400">Correct Outcome</h3>
								<p class="mb-3 text-sm text-slate-300">1 point</p>
								<div class="rounded-lg bg-slate-800/50 p-3">
									<p class="text-xs text-slate-400">
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
