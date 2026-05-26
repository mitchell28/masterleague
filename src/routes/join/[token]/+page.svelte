<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { Trophy, UserCheck, XCircle, AlertCircle, LogIn, Users } from '@lucide/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let accepting = $state(false);
	let rejecting = $state(false);
</script>

<svelte:head>
	<title>Join {data.org?.name ?? 'Master League'} · Master League</title>
</svelte:head>

<div class="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
	<!-- Pitch background lines (matches OffSeason) -->
	<div class="pointer-events-none absolute inset-0">
		<div class="bg-accent/5 absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"></div>
		<div class="absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5 md:h-120 md:w-120"></div>
		<div class="absolute top-1/2 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10"></div>
	</div>

	<div class="relative z-10 w-full max-w-md">
		<!-- Brand mark -->
		<div class="mb-8 text-center">
			<a href="/" class="inline-block">
				<div class="font-display text-accent text-2xl font-black tracking-tight">MASTER LEAGUE</div>
			</a>
		</div>

		<div class="overflow-hidden bg-slate-900">
			{#if data.errorMessage}
				<!-- Invalid / expired invite -->
				<div class="border-b-4 border-b-red-500/60 p-8">
					<div class="flex flex-col items-center gap-4 text-center">
						<div class="flex h-16 w-16 items-center justify-center bg-red-500/10">
							<AlertCircle class="text-red-400" size={32} />
						</div>
						<span
							class="font-display inline-block bg-red-500/20 px-3 pt-2 pb-1.5 text-xs font-medium text-red-300"
							style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
						>INVITE UNAVAILABLE</span>
						<h1 class="font-display text-2xl font-bold text-white">Can't join right now</h1>
						<p class="text-sm text-white/60">{data.errorMessage}</p>
						<a
							href="/"
							class="mt-2 inline-flex items-center gap-2 border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
						>← Back to home</a>
					</div>
				</div>

			{:else if data.requiresAuth}
				<!-- Needs to log in first -->
				<div class="border-b-accent border-b-4 p-8">
					<div class="flex flex-col items-center gap-5 text-center">
						<div class="bg-accent/10 flex h-20 w-20 items-center justify-center">
							<Trophy class="text-accent" size={36} />
						</div>
						<span
							class="bg-accent font-display inline-block px-3 pt-2 pb-1.5 text-xs font-medium text-black"
							style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
						>YOU'RE INVITED</span>
						{#if data.inviter?.name && data.org?.name}
							<div>
								<p class="text-sm text-white/60">
									<span class="font-semibold text-white">{data.inviter.name}</span> wants you to join
								</p>
								<h1 class="font-display mt-1 text-3xl font-bold text-white">{data.org.name}</h1>
							</div>
						{:else}
							<h1 class="font-display text-2xl font-bold text-white">Join the league</h1>
						{/if}
						<p class="text-sm text-white/40">Sign in or create an account to accept.</p>
						<a
							href={data.loginUrl ?? '/auth/login'}
							class="bg-accent flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold text-black transition hover:brightness-110"
						>
							<LogIn size={16} /> Sign in to accept
						</a>
					</div>
				</div>

			{:else if data.invite && data.org}
				<!-- Logged in — show acceptance form -->
				<div class="border-b-accent border-b-4 p-8">
					<div class="flex flex-col items-center gap-5 text-center">
						<div class="bg-accent/10 flex h-20 w-20 items-center justify-center">
							<Trophy class="text-accent" size={36} />
						</div>
						<span
							class="bg-accent font-display inline-block px-3 pt-2 pb-1.5 text-xs font-medium text-black"
							style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
						>YOU'RE INVITED</span>
						<div>
							{#if data.inviter?.name}
								<p class="text-sm text-white/60">
									<span class="font-semibold text-white">{data.inviter.name}</span> wants you to join
								</p>
							{/if}
							<h1 class="font-display mt-1 text-3xl font-bold text-white">{data.org.name}</h1>
							{#if data.invite.role}
								<span class="bg-accent/15 text-accent mt-3 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium capitalize">
									<Users size={11} /> {data.invite.role}
								</span>
							{/if}
						</div>
					</div>

					{#if form?.error}
						<div class="mt-6 border-l-2 border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-400">
							{form.error}
						</div>
					{/if}

					<div class="mt-8 flex flex-col gap-3">
						<form
							method="POST"
							action="?/accept"
							use:enhance={() => {
								accepting = true;
								return async ({ update }) => {
									await update();
									accepting = false;
								};
							}}
						>
							<button
								type="submit"
								disabled={accepting || rejecting}
								class="bg-accent flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
							>
								<UserCheck size={16} />
								{accepting ? 'Joining…' : 'Accept invitation'}
							</button>
						</form>

						<form
							method="POST"
							action="?/reject"
							use:enhance={() => {
								rejecting = true;
								return async ({ update }) => {
									await update();
									rejecting = false;
								};
							}}
						>
							<button
								type="submit"
								disabled={accepting || rejecting}
								class="flex w-full items-center justify-center gap-2 border border-white/10 py-3 text-sm text-white/50 transition hover:border-white/20 hover:text-white/80 disabled:opacity-50"
							>
								<XCircle size={16} />
								{rejecting ? 'Declining…' : 'Decline'}
							</button>
						</form>
					</div>
				</div>
			{/if}
		</div>

		<p class="mt-6 text-center text-xs text-white/30">
			Predict scores · Earn points · Beat your mates
		</p>
	</div>
</div>
