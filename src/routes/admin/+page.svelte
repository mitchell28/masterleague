<script lang="ts">
	import { toast } from 'svelte-sonner';
	import {
		RefreshCw,
		Calculator,
		Trophy,
		AlertTriangle,
		Play,
		Database,
		Settings,
		Users,
		BarChart3,
		Clock
	} from '@lucide/svelte';

	// State management for various admin operations
	let loadingStates = $state({
		recalculatePoints: false,
		checkMissingFixtures: false,
		updateLiveScores: false,
		updateLeaderboard: false,
		healthCheck: false,
		predictionsUpdate: false,
		fixtureSchedule: false
	});

	// Admin function to recalculate all points
	async function recalculateAllPoints() {
		if (loadingStates.recalculatePoints) return;

		loadingStates.recalculatePoints = true;

		try {
			const response = await fetch('/api/admin/recalculate-points', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await response.json();

			if (result.success) {
				toast.success(result.message, { duration: 5000 });
			} else {
				toast.error(result.message, { duration: 5000 });
			}
		} catch (error) {
			console.error('Failed to recalculate points:', error);
			toast.error('Failed to recalculate points. Please try again.', { duration: 4000 });
		} finally {
			loadingStates.recalculatePoints = false;
		}
	}

	// Admin function to check for missing fixtures
	async function checkMissingFixtures() {
		if (loadingStates.checkMissingFixtures) return;

		loadingStates.checkMissingFixtures = true;

		try {
			const response = await fetch('/api/cron/finished-fixtures-checker', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ force: true, debug: true })
			});

			const result = await response.json();

			if (result.success) {
				toast.success(result.message, { duration: 5000 });
			} else {
				toast.error(result.message || 'Failed to check missing fixtures', { duration: 5000 });
			}
		} catch (error) {
			console.error('Failed to check missing fixtures:', error);
			toast.error('Failed to check missing fixtures. Please try again.', { duration: 4000 });
		} finally {
			loadingStates.checkMissingFixtures = false;
		}
	}

	// Admin function to update live scores
	async function updateLiveScores() {
		if (loadingStates.updateLiveScores) return;

		loadingStates.updateLiveScores = true;

		try {
			const response = await fetch('/api/cron/live-scores-updater', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ force: true })
			});

			const result = await response.json();

			if (result.success) {
				toast.success(result.message, { duration: 5000 });
			} else {
				toast.error(result.message || 'Failed to update live scores', { duration: 5000 });
			}
		} catch (error) {
			console.error('Failed to update live scores:', error);
			toast.error('Failed to update live scores. Please try again.', { duration: 4000 });
		} finally {
			loadingStates.updateLiveScores = false;
		}
	}

	// Admin function to update leaderboard
	async function updateLeaderboard() {
		if (loadingStates.updateLeaderboard) return;

		loadingStates.updateLeaderboard = true;

		try {
			const response = await fetch('/api/update-leaderboard', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await response.json();

			if (result.success) {
				toast.success(result.message, { duration: 5000 });
			} else {
				toast.error(result.message || 'Failed to update leaderboard', { duration: 5000 });
			}
		} catch (error) {
			console.error('Failed to update leaderboard:', error);
			toast.error('Failed to update leaderboard. Please try again.', { duration: 4000 });
		} finally {
			loadingStates.updateLeaderboard = false;
		}
	}

	// Admin function for health check
	async function runHealthCheck() {
		if (loadingStates.healthCheck) return;

		loadingStates.healthCheck = true;

		try {
			const response = await fetch('/api/cron/health', {
				method: 'GET' // Use GET to retrieve health status
			});

			const result = await response.json();

			if (result.success) {
				toast.success(
					`Health check passed: ${result.healthPercentage}% healthy (${result.healthyJobs}/${result.totalJobs} jobs)`,
					{ duration: 5000 }
				);
			} else {
				toast.warning('Health check completed with warnings', { duration: 4000 });
			}
		} catch (error) {
			console.error('Health check failed:', error);
			toast.error('Health check failed. Please investigate.', { duration: 4000 });
		} finally {
			loadingStates.healthCheck = false;
		}
	}

	// Admin function to trigger predictions update
	async function triggerPredictionsUpdate() {
		if (loadingStates.predictionsUpdate) return;

		loadingStates.predictionsUpdate = true;

		try {
			const response = await fetch('/api/cron/predictions-update?force=true', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await response.json();

			if (result.success) {
				toast.success(result.message || 'Predictions update completed successfully', {
					duration: 5000
				});
			} else {
				toast.error(result.message || 'Failed to update predictions', { duration: 5000 });
			}
		} catch (error) {
			console.error('Failed to trigger predictions update:', error);
			toast.error('Failed to trigger predictions update. Please try again.', { duration: 4000 });
		} finally {
			loadingStates.predictionsUpdate = false;
		}
	}

	// Admin function to check fixture schedule
	async function checkFixtureSchedule() {
		if (loadingStates.fixtureSchedule) return;

		loadingStates.fixtureSchedule = true;

		try {
			const response = await fetch('/api/cron/fixture-schedule', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ force: true })
			});

			const result = await response.json();

			if (result.success) {
				toast.success(result.message, { duration: 5000 });
			} else {
				toast.error(result.message || 'Failed to check fixture schedule', { duration: 5000 });
			}
		} catch (error) {
			console.error('Failed to check fixture schedule:', error);
			toast.error('Failed to check fixture schedule. Please try again.', { duration: 4000 });
		} finally {
			loadingStates.fixtureSchedule = false;
		}
	}
</script>

<div class="mx-auto mt-22">
	<!-- Main Header with clean geometric design and mobile responsive layout -->
	<div class="relative mb-4 sm:mb-6">
		<div class="font-display w-full overflow-hidden bg-slate-900">
			<!-- Main Header Content -->
			<div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
				<!-- Mobile Layout: Stack vertically -->
				<div class="flex flex-col gap-4 sm:hidden">
					<div class="text-center">
						<h1 class="text-2xl font-bold text-white">Admin Panel</h1>
						<div class="mt-2 flex flex-col items-center gap-2">
							<span class="text-xs font-medium text-slate-300">
								System Administration & Management
							</span>
						</div>
					</div>
				</div>

				<!-- Desktop Layout: Side by side -->
				<div class="hidden sm:block">
					<div class="mb-3 flex items-center justify-between">
						<div>
							<h1 class="text-3xl font-bold text-white lg:text-4xl">Admin Panel</h1>
							<div class="mt-2 flex items-center gap-3">
								<span class="text-sm font-medium text-slate-300">
									System Administration & Management
								</span>
							</div>
						</div>
						<div class="flex items-center gap-4 text-base text-slate-400">
							<div class="flex items-center gap-2">
								<Settings size={18} />
								<span>Admin Tools</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-6xl px-4 sm:px-6">
		<!-- Admin sections organized by category -->

		<!-- Points & Scoring Section -->
		<div class="mb-8 overflow-hidden bg-slate-800/50">
			<div class="border-b border-slate-700/60 px-4 py-4 sm:px-6">
				<div class="flex items-center gap-3">
					<Calculator class="text-blue-400" size={20} />
					<h2 class="text-lg font-semibold text-white">Points & Scoring</h2>
				</div>
				<p class="mt-1 text-sm text-slate-400">Manage scoring calculations and point systems</p>
			</div>
			<div class="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
				<button
					onclick={recalculateAllPoints}
					disabled={loadingStates.recalculatePoints}
					class="flex items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-left transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<RefreshCw
						size={18}
						class={loadingStates.recalculatePoints ? 'animate-spin text-white' : 'text-blue-100'}
					/>
					<div>
						<div class="font-medium text-white">
							{loadingStates.recalculatePoints ? 'Recalculating...' : 'Recalculate All Points'}
						</div>
						<div class="text-xs text-blue-200">
							Recalculate points for all users and predictions
						</div>
					</div>
				</button>

				<button
					onclick={updateLeaderboard}
					disabled={loadingStates.updateLeaderboard}
					class="flex items-center gap-3 rounded-lg bg-purple-600 px-4 py-3 text-left transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Trophy
						size={18}
						class={loadingStates.updateLeaderboard ? 'animate-spin text-white' : 'text-purple-100'}
					/>
					<div>
						<div class="font-medium text-white">
							{loadingStates.updateLeaderboard ? 'Updating...' : 'Update Leaderboard'}
						</div>
						<div class="text-xs text-purple-200">Refresh leaderboard rankings and statistics</div>
					</div>
				</button>
			</div>
		</div>

		<!-- Fixtures & Scores Section -->
		<div class="mb-8 overflow-hidden bg-slate-800/50">
			<div class="border-b border-slate-700/60 px-4 py-4 sm:px-6">
				<div class="flex items-center gap-3">
					<BarChart3 class="text-green-400" size={20} />
					<h2 class="text-lg font-semibold text-white">Fixtures & Scores</h2>
				</div>
				<p class="mt-1 text-sm text-slate-400">Manage fixture data and live score updates</p>
			</div>
			<div class="grid gap-4 p-4 sm:grid-cols-3 sm:p-6">
				<button
					onclick={checkMissingFixtures}
					disabled={loadingStates.checkMissingFixtures}
					class="flex items-center gap-3 rounded-lg bg-orange-600 px-4 py-3 text-left transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<AlertTriangle
						size={18}
						class={loadingStates.checkMissingFixtures
							? 'animate-spin text-white'
							: 'text-orange-100'}
					/>
					<div>
						<div class="font-medium text-white">
							{loadingStates.checkMissingFixtures ? 'Checking...' : 'Check Missing Fixtures'}
						</div>
						<div class="text-xs text-orange-200">Find and update fixtures missing scores</div>
					</div>
				</button>

				<button
					onclick={updateLiveScores}
					disabled={loadingStates.updateLiveScores}
					class="flex items-center gap-3 rounded-lg bg-red-600 px-4 py-3 text-left transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Play
						size={18}
						class={loadingStates.updateLiveScores ? 'animate-spin text-white' : 'text-red-100'}
					/>
					<div>
						<div class="font-medium text-white">
							{loadingStates.updateLiveScores ? 'Updating...' : 'Update Live Scores'}
						</div>
						<div class="text-xs text-red-200">Force update all live match scores</div>
					</div>
				</button>

				<button
					onclick={checkFixtureSchedule}
					disabled={loadingStates.fixtureSchedule}
					class="flex items-center gap-3 rounded-lg bg-amber-600 px-4 py-3 text-left transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Clock
						size={18}
						class={loadingStates.fixtureSchedule ? 'animate-spin text-white' : 'text-amber-100'}
					/>
					<div>
						<div class="font-medium text-white">
							{loadingStates.fixtureSchedule ? 'Checking...' : 'Check Fixture Schedule'}
						</div>
						<div class="text-xs text-amber-200">Check for fixture schedule changes</div>
					</div>
				</button>
			</div>
		</div>

		<!-- System & Maintenance Section -->
		<div class="mb-8 overflow-hidden bg-slate-800/50">
			<div class="border-b border-slate-700/60 px-4 py-4 sm:px-6">
				<div class="flex items-center gap-3">
					<Database class="text-indigo-400" size={20} />
					<h2 class="text-lg font-semibold text-white">System & Maintenance</h2>
				</div>
				<p class="mt-1 text-sm text-slate-400">System health checks and maintenance operations</p>
			</div>
			<div class="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
				<button
					onclick={runHealthCheck}
					disabled={loadingStates.healthCheck}
					class="flex items-center gap-3 rounded-lg bg-teal-600 px-4 py-3 text-left transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Database
						size={18}
						class={loadingStates.healthCheck ? 'animate-spin text-white' : 'text-teal-100'}
					/>
					<div>
						<div class="font-medium text-white">
							{loadingStates.healthCheck ? 'Checking...' : 'System Health Check'}
						</div>
						<div class="text-xs text-teal-200">Run comprehensive system health check</div>
					</div>
				</button>

				<button
					onclick={triggerPredictionsUpdate}
					disabled={loadingStates.predictionsUpdate}
					class="flex items-center gap-3 rounded-lg bg-emerald-600 px-4 py-3 text-left transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Users
						size={18}
						class={loadingStates.predictionsUpdate ? 'animate-spin text-white' : 'text-emerald-100'}
					/>
					<div>
						<div class="font-medium text-white">
							{loadingStates.predictionsUpdate ? 'Updating...' : 'Update Predictions'}
						</div>
						<div class="text-xs text-emerald-200">Trigger predictions update process</div>
					</div>
				</button>
			</div>
		</div>

		<!-- Warning Notice -->
		<div class="mb-8 rounded-lg border border-yellow-600/50 bg-yellow-900/20 p-4">
			<div class="flex items-start gap-3">
				<AlertTriangle class="mt-0.5 text-yellow-400" size={20} />
				<div>
					<h3 class="font-medium text-yellow-200">Admin Actions Warning</h3>
					<p class="mt-1 text-sm text-yellow-300">
						These are powerful administrative functions that can affect all users and data. Use with
						caution and ensure you understand the impact of each action before proceeding.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
