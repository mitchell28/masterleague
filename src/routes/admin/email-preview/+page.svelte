<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let currentTemplate = $derived(data.template);

	function selectTemplate(template: string) {
		goto(`/admin/email-preview?template=${template}`);
	}
</script>

<div class="min-h-screen bg-slate-950 p-8">
	<div class="mx-auto max-w-4xl">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="font-display text-2xl font-bold text-white">Email Template Preview</h1>
			<p class="mt-2 text-slate-400">Preview and test email templates during development</p>
		</div>

		<!-- Template selector -->
		<div class="mb-6 flex gap-2">
			{#each data.availableTemplates as template}
				<button
					onclick={() => selectTemplate(template)}
					class="px-4 py-2 text-sm font-medium transition-colors {currentTemplate === template
						? 'bg-accent text-black'
						: 'bg-slate-800 text-slate-300 hover:bg-slate-700'}"
					style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
				>
					{template}
				</button>
			{/each}
		</div>

		<!-- Email preview -->
		<div class="border-accent/30 overflow-hidden border bg-slate-900">
			<div class="bg-accent/10 border-accent/30 flex items-center gap-2 border-b px-4 py-3">
				<span class="text-sm text-slate-300">Email Preview: {currentTemplate}</span>
			</div>
			<div class="bg-slate-950 p-4">
				<iframe
					srcdoc={data.renderedHtml}
					title="Email Preview"
					class="mx-auto h-[800px] w-full max-w-xl shadow-lg"
				></iframe>
			</div>
		</div>

		<!-- Props display -->
		<div class="border-accent/30 mt-6 border bg-slate-900 p-4">
			<h3 class="text-accent mb-2 text-sm font-semibold tracking-wide uppercase">Current Props</h3>
			<pre class="text-xs text-slate-300">{JSON.stringify(data.props, null, 2)}</pre>
		</div>

		<!-- Test send form -->
		<div class="border-accent/30 mt-6 border bg-slate-900 p-4">
			<h3 class="text-accent mb-4 text-sm font-semibold tracking-wide uppercase">
				Send Test Email
			</h3>
			<form method="POST" class="flex gap-4">
				<input
					type="email"
					name="email"
					placeholder="test@example.com"
					class="border-accent/30 flex-1 border bg-slate-800 px-4 py-2 text-white placeholder-slate-500"
				/>
				<button
					type="submit"
					class="bg-accent px-6 py-2 font-medium text-black transition-colors hover:brightness-110"
					style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
				>
					Send Test
				</button>
			</form>
		</div>
	</div>
</div>
