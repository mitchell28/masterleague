<script lang="ts">
	import { onMount } from 'svelte';

	let initialized = $state(false);
	let loading = $state(true);
	let error = $state('');
	let activeTab = $state('how-it-works');

	onMount(async () => {
		try {
			// Initialize the database with Premier League teams
			const response = await fetch('/api/init');
			const data = await response.json();

			if (data.success) {
				initialized = true;
			} else {
				error = data.message || 'Failed to initialize the database';
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
	<!-- Hero Background Elements -->
	<div class="absolute inset-0 -z-10 overflow-hidden">
		<div
			class="absolute top-0 left-0 h-full w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-700/30 via-slate-900/80 to-slate-950"
		></div>
		<div class="absolute top-0 left-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl"></div>
		<div class="absolute top-20 right-1/4 h-64 w-64 rounded-full bg-slate-400/10 blur-3xl"></div>
		<div class="absolute right-1/3 bottom-0 h-80 w-80 rounded-full bg-slate-300/10 blur-3xl"></div>
	</div>

	<!-- Hero Section -->
	<section class="container mx-auto px-4 py-16 md:py-24">
		<div class="mx-auto max-w-4xl text-center">
			<h1 class="font-display mb-6 text-4xl font-bold md:text-6xl">
				<span class="text-gradient">Premier League</span>
				<br />
				<span>Prediction League</span>
			</h1>
			<p class="mx-auto mb-10 max-w-2xl text-lg text-slate-300 md:text-xl">
				Predict match scores, compete with friends, and climb the leaderboard in this AI-powered
				Premier League prediction platform.
			</p>

			{#if loading}
				<div class="glass-panel mb-10 flex items-center justify-center rounded-2xl p-6">
					<div class="flex flex-col items-center gap-4">
						<div
							class="size-16 animate-spin rounded-full border-4 border-t-slate-300 border-r-slate-400 border-b-slate-500 border-l-transparent"
						></div>
						<p class="text-slate-300">Initializing application...</p>
					</div>
				</div>
			{:else if error}
				<div class="glass-panel mb-10 rounded-2xl border-l-4 border-red-500 p-6">
					<div class="flex items-start gap-4">
						<div
							class="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-500"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								class="size-6"
							>
								<path
									fill-rule="evenodd"
									d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
									clip-rule="evenodd"
								/>
							</svg>
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
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="currentColor"
									class="size-6"
								>
									<path
										fill-rule="evenodd"
										d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<div class="flex flex-wrap justify-center gap-4">
				<a
					href="/fixtures"
					class="silver-gradient glow-button rounded-xl px-6 py-3 font-medium text-black shadow-md transition-all hover:shadow-lg"
				>
					View This Week's Fixtures
				</a>
				<a
					href="/predictions"
					class="rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 font-medium text-white transition-all hover:bg-slate-700"
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
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								class="size-8 text-black"
							>
								<path
									fill-rule="evenodd"
									d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 0 1-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 0 1-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 0 1-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584ZM12 18a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
									clip-rule="evenodd"
								/>
							</svg>
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
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								class="size-8 text-black"
							>
								<path
									d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"
								/>
							</svg>
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
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								class="size-8 text-black"
							>
								<path
									fill-rule="evenodd"
									d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
									clip-rule="evenodd"
								/>
							</svg>
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
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										class="size-6"
									>
										<path
											fill-rule="evenodd"
											d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 0 1 1.04-.208Z"
											clip-rule="evenodd"
										/>
									</svg>
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
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										class="size-6"
									>
										<path
											fill-rule="evenodd"
											d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm.53 5.47a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 1 0 1.06 1.06l1.72-1.72v5.69a.75.75 0 0 0 1.5 0v-5.69l1.72 1.72a.75.75 0 1 0 1.06-1.06l-3-3Z"
											clip-rule="evenodd"
										/>
									</svg>
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
