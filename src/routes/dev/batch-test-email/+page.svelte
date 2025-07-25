<script lang="ts">
	import { Loader2 } from '@lucide/svelte';

	let testEmails: string = $state(
		'billymitchell287@gmail.com\nbilly@victory.digital\ntest@yahoo.com\ntest@outlook.com'
	);
	let isLoading: boolean = $state(false);
	let results: any = $state(null);
	let error: string = $state('');

	async function runBatchTest() {
		const emails = testEmails
			.split('\n')
			.map((e) => e.trim())
			.filter((e) => e);

		if (emails.length === 0) {
			error = 'Please enter at least one email address';
			return;
		}

		try {
			isLoading = true;
			error = '';
			results = null;

			const response = await fetch('/api/dev/batch-test-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ emails })
			});

			const data = await response.json();

			if (response.ok) {
				results = data;
			} else {
				error = data.error || 'Failed to run batch test';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Network error';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
	<div class="mx-auto max-w-4xl">
		<div class="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8 backdrop-blur-sm">
			<h1 class="mb-6 text-3xl font-bold text-white">Batch Email Test</h1>
			<p class="mb-6 text-slate-300">
				Test multiple email addresses simultaneously to compare Resend API responses across
				different domains.
			</p>

			<div class="space-y-4">
				<div>
					<label for="emails" class="mb-2 block text-sm font-medium text-slate-300">
						Email Addresses (one per line)
					</label>
					<textarea
						id="emails"
						bind:value={testEmails}
						rows="6"
						placeholder="billymitchell287@gmail.com&#10;billy@victory.digital&#10;test@yahoo.com&#10;test@outlook.com"
						class="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
					></textarea>
				</div>

				<button
					onclick={runBatchTest}
					disabled={isLoading}
					class="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 font-semibold text-white transition-all duration-200 hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isLoading}
						<div class="flex items-center justify-center">
							<Loader2 class="mr-2 h-5 w-5 animate-spin" />
							Running Batch Test...
						</div>
					{:else}
						Run Batch Test
					{/if}
				</button>
			</div>

			{#if error}
				<div class="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
					<h3 class="font-semibold text-red-400">Error</h3>
					<p class="text-red-300">{error}</p>
				</div>
			{/if}

			{#if results}
				<div class="mt-8 space-y-6">
					<!-- Summary -->
					<div class="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
						<h3 class="font-semibold text-green-400">Batch Test Results</h3>
						<div class="mt-2 grid grid-cols-2 gap-4 text-sm text-green-300 md:grid-cols-4">
							<div>Total: {results.analysis.totalTested}</div>
							<div>Successful: {results.analysis.successful}</div>
							<div>With Email ID: {results.analysis.withEmailId}</div>
							<div>Without Email ID: {results.analysis.withoutEmailId}</div>
						</div>
					</div>

					<!-- Domain Analysis -->
					<div class="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
						<h3 class="font-semibold text-blue-400">Domain Analysis</h3>
						<div class="mt-2 overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b border-blue-500/20">
										<th class="text-left text-blue-300">Domain</th>
										<th class="text-left text-blue-300">Success Rate</th>
										<th class="text-left text-blue-300">Email ID Rate</th>
										<th class="text-left text-blue-300">Avg Response Time</th>
									</tr>
								</thead>
								<tbody>
									{#each Object.entries(results.analysis.domainAnalysis) as [domain, stats]}
										<tr class="border-b border-blue-500/10">
											<td class="py-1 text-blue-200">{domain}</td>
											<td class="py-1 text-blue-200">{stats.successful}/{stats.total}</td>
											<td class="py-1 text-blue-200">{stats.withEmailId}/{stats.successful}</td>
											<td class="py-1 text-blue-200">{Math.round(stats.avgResponseTime)}ms</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Individual Results -->
					<div class="rounded-lg border border-slate-600 bg-slate-700/30 p-4">
						<h3 class="mb-2 font-semibold text-slate-300">Individual Results</h3>
						<div class="space-y-2">
							{#each results.results as result}
								<div
									class="rounded border {result.success
										? 'border-green-500/20 bg-green-500/5'
										: 'border-red-500/20 bg-red-500/5'} p-3"
								>
									<div class="flex items-center justify-between">
										<div>
											<span class="font-medium {result.success ? 'text-green-300' : 'text-red-300'}"
												>{result.email}</span
											>
											<span class="ml-2 text-sm text-slate-400">({result.domain})</span>
										</div>
										<div class="text-sm">
											{#if result.success}
												{#if result.hasEmailId}
													<span class="text-green-400">✅ ID: {result.emailId}</span>
												{:else}
													<span class="text-yellow-400">⚠️ No Email ID</span>
												{/if}
											{:else}
												<span class="text-red-400">❌ Failed</span>
											{/if}
										</div>
									</div>
									{#if result.error}
										<div class="mt-1 text-sm text-red-300">{result.error}</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>

					<!-- Raw Data (collapsible) -->
					<details class="rounded-lg border border-slate-600 bg-slate-700/30 p-4">
						<summary class="cursor-pointer font-semibold text-slate-300"
							>Raw Data (Click to expand)</summary
						>
						<pre class="mt-2 overflow-x-auto text-xs text-slate-400">{JSON.stringify(
								results,
								null,
								2
							)}</pre>
					</details>
				</div>
			{/if}
		</div>
	</div>
</div>
