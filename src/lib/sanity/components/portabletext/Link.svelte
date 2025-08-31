<script lang="ts">
	interface LinkProps {
		portableText: {
			value: {
				href: string;
			};
		};
		children: any;
	}

	let { portableText, children }: LinkProps = $props();
</script>

<a
	href={portableText.value.href}
	target="_blank"
	rel="noopener noreferrer"
	class="text-accent hover:text-accent/80 underline transition-colors"
>
	{@render children()}
</a>
