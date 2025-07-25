<script lang="ts">
	import { Loader2 } from '@lucide/svelte';

	let email: string = $state('');
	let isLoading: boolean = $state(false);
	let result: any = $state(null);
	let error: string = $state('');

	async function testEmail() {
		if (!email) {
			error = 'Please enter an email address';
			return;
		}

		try {
			isLoading = true;
			error = '';
			result = null;

			const response = await fetch('/api/dev/test-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const data = await response.json();

			if (response.ok) {
				result = data;
			} else {
				error = data.error || 'Failed to send test email';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Network error';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
	<div class="mx-auto max-w-2xl">
		<div class="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8 backdrop-blur-sm">
			<h1 class="mb-6 text-3xl font-bold text-white">Email Test Tool</h1>
			<p class="mb-6 text-slate-300">
				Test email delivery with different email providers to debug OTP issues.
			</p>

			<div class="space-y-4">
				<div>
					<label for="email" class="mb-2 block text-sm font-medium text-slate-300">
						Test Email Address
					</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						placeholder="test@example.com"
						class="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
					/>
				</div>

				<button
					onclick={testEmail}
					disabled={isLoading || !email}
					class="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 font-semibold text-white transition-all duration-200 hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isLoading}
						<div class="flex items-center justify-center">
							<Loader2 class="mr-2 h-5 w-5 animate-spin" />
							Sending Test Email...
						</div>
					{:else}
						Send Test Email
					{/if}
				</button>
			</div>

			{#if error}
				<div class="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
					<h3 class="font-semibold text-red-400">Error</h3>
					<p class="text-red-300">{error}</p>
				</div>
			{/if}

			{#if result}
				<div class="mt-6 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
					<h3 class="font-semibold text-green-400">Success!</h3>
					<p class="text-green-300">{result.message}</p>
					<div class="mt-2 text-sm text-green-300">
						<p>Email ID: {result.emailId}</p>
						<p>Domain: {result.domain}</p>
					</div>
				</div>
			{/if}

			<div class="mt-8 rounded-lg border border-slate-600 bg-slate-700/30 p-4">
				<h3 class="mb-2 font-semibold text-slate-300">Test Instructions:</h3>
				<ol class="list-inside list-decimal space-y-1 text-sm text-slate-400">
					<li>Enter an email address from different providers (Gmail, Yahoo, Outlook, etc.)</li>
					<li>Click "Send Test Email" to test basic email functionality</li>
					<li>Check your email inbox (and spam folder) for the test message</li>
					<li>Check the browser console and server logs for detailed error information</li>
					<li>Compare results between Gmail and other email providers</li>
				</ol>
			</div>
		</div>
	</div>
</div>
