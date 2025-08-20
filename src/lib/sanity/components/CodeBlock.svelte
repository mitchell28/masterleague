<script lang="ts">
	interface CodeValue {
		language: string;
		code: string;
		filename?: string;
	}

	interface Props {
		value: CodeValue;
	}

	let { value }: Props = $props();

	// Language display names
	const languageNames: Record<string, string> = {
		javascript: 'JavaScript',
		typescript: 'TypeScript',
		html: 'HTML',
		css: 'CSS',
		json: 'JSON',
		bash: 'Bash',
		python: 'Python',
		sql: 'SQL'
	};

	let displayLanguage = $derived(languageNames[value.language] || value.language);
</script>

<div class="my-6">
	<!-- Header with language and filename -->
	<div
		class="flex items-center justify-between rounded-t-lg border-b border-slate-700 bg-slate-800 px-4 py-2"
	>
		<div class="flex items-center gap-3">
			{#if value.filename}
				<span class="text-accent text-sm font-medium">{value.filename}</span>
			{/if}
			<span class="text-xs tracking-wide text-white/60 uppercase">{displayLanguage}</span>
		</div>
		<!-- Copy button could go here -->
		<button
			class="hover:text-accent text-xs text-white/60 transition-colors"
			onclick={() => navigator.clipboard.writeText(value.code)}
		>
			Copy
		</button>
	</div>

	<!-- Code content -->
	<div class="overflow-x-auto rounded-b-lg bg-slate-900">
		<pre class="p-4"><code class="font-mono text-sm leading-relaxed text-white/90"
				>{value.code}</code
			></pre>
	</div>
</div>
