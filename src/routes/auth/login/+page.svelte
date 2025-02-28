<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="flex min-h-[calc(100vh-10rem)] items-center justify-center">
	<div class="card variant-glass-surface w-full max-w-md p-8">
		<header class="card-header text-center">
			<h1 class="h2">Login/Register</h1>
		</header>

		<section class="p-4">
			<form method="post" action="?/login" use:enhance class="space-y-4">
				<label class="label">
					<span>Username</span>
					<input class="input" id="username" name="username" placeholder="Enter username" />
				</label>

				<label class="label">
					<span>Password</span>
					<input
						class="input"
						id="password"
						type="password"
						name="password"
						placeholder="Enter password"
					/>
				</label>

				<div class="flex gap-4 pt-2">
					<button class="btn preset-filled w-1/2"> Login </button>
					<button formaction="?/register" class="btn preset-filled w-1/2"> Register </button>
				</div>
			</form>

			{#if form?.message}
				<div class="alert variant-filled-error mt-4">
					<p>{form.message}</p>
				</div>
			{/if}
		</section>
	</div>
</div>
