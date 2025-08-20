<script lang="ts">
	interface CalloutValue {
		type: 'info' | 'warning' | 'success' | 'error';
		title?: string;
		content: string;
	}

	interface Props {
		value: CalloutValue;
	}

	let { value }: Props = $props();

	const typeStyles = {
		info: {
			bg: 'bg-blue-900/20 border-blue-500/30',
			icon: '💡',
			iconBg: 'bg-blue-500',
			textColor: 'text-blue-100'
		},
		warning: {
			bg: 'bg-yellow-900/20 border-yellow-500/30',
			icon: '⚠️',
			iconBg: 'bg-yellow-500',
			textColor: 'text-yellow-100'
		},
		success: {
			bg: 'bg-green-900/20 border-green-500/30',
			icon: '✅',
			iconBg: 'bg-green-500',
			textColor: 'text-green-100'
		},
		error: {
			bg: 'bg-red-900/20 border-red-500/30',
			icon: '❌',
			iconBg: 'bg-red-500',
			textColor: 'text-red-100'
		}
	};

	let style = $derived(typeStyles[value.type]);
</script>

<div class="my-6 rounded-lg border p-6 {style.bg}">
	<div class="flex items-start gap-4">
		<div
			class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded {style.iconBg}"
			style="clip-path: polygon(15% 0%, 100% 0%, 100% 85%, 85% 100%, 0% 100%, 0% 15%);"
		>
			<span class="text-lg">{style.icon}</span>
		</div>
		<div class="flex-1">
			{#if value.title}
				<h4 class="mb-2 font-semibold {style.textColor}">{value.title}</h4>
			{/if}
			<p class="leading-relaxed text-white/90">{value.content}</p>
		</div>
	</div>
</div>
