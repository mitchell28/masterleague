<script lang="ts">
	export let value: {
		type: 'info' | 'warning' | 'success' | 'error';
		title?: string;
		content: string;
	};

	const typeStyles = {
		info: {
			bg: 'bg-blue-900/20 border-blue-500/30',
			icon: '💡',
			iconBg: 'bg-blue-500'
		},
		warning: {
			bg: 'bg-yellow-900/20 border-yellow-500/30',
			icon: '⚠️',
			iconBg: 'bg-yellow-500'
		},
		success: {
			bg: 'bg-green-900/20 border-green-500/30',
			icon: '✅',
			iconBg: 'bg-green-500'
		},
		error: {
			bg: 'bg-red-900/20 border-red-500/30',
			icon: '❌',
			iconBg: 'bg-red-500'
		}
	};

	$: style = typeStyles[value.type];
</script>

<div class="my-6 rounded border p-4 {style.bg}">
	<div class="flex items-start gap-3">
		<div
			class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded {style.iconBg}"
			style="clip-path: polygon(15% 0%, 100% 0%, 100% 85%, 85% 100%, 0% 100%, 0% 15%);"
		>
			<span class="text-sm">{style.icon}</span>
		</div>
		<div class="flex-1">
			{#if value.title}
				<h4 class="mb-2 font-semibold text-white">{value.title}</h4>
			{/if}
			<p class="leading-relaxed text-white/90">{value.content}</p>
		</div>
	</div>
</div>
