<script lang="ts">
	import {
		useGroups,
		useSubscription,
		userGroups,
		activeGroup,
		hasActiveSubscription,
		availablePlans,
		type GroupWithMembers
	} from '$lib/hooks';

	// Local state for invite codes
	let groupInviteCodes = $state<Record<string, any[]>>({});
	let loadingInvites = $state<string | null>(null);

	// Toast notification state
	let toasts = $state<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>(
		[]
	);

	const {
		createGroup,
		joinGroup,
		loadUserGroups,
		generateInviteCode,
		getGroupInviteCodes,
		deleteInviteCode,
		removeMember
	} = useGroups();

	const { upgradeSubscription, loadPlans, loadSubscription, cancelSubscription } =
		useSubscription();

	let showCreateGroup = $state(false);
	let showJoinGroup = $state(false);
	let showSubscriptionPlans = $state(false);
	let showInviteCodes = $state<string | null>(null); // Track which group's invite codes to show
	let newGroupName = $state('');
	let newGroupDescription = $state('');
	let inviteCode = $state('');
	let selectedPlan = $state('');
	let isAnnual = $state(false);

	function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
		const id = `toast_${Date.now()}`;
		toasts = [...toasts, { id, message, type }];

		// Auto-remove after 5 seconds
		setTimeout(() => {
			toasts = toasts.filter((toast) => toast.id !== id);
		}, 5000);
	}

	function removeToast(id: string) {
		toasts = toasts.filter((toast) => toast.id !== id);
	}

	$effect(() => {
		const loadData = async () => {
			await loadUserGroups();
			await loadPlans();

			// Load subscription for active group
			if ($activeGroup) {
				await loadSubscription($activeGroup.id);
			}
		};

		loadData();
	});

	async function handleCreateGroup() {
		if (!newGroupName.trim()) return;

		const result = await createGroup({
			name: newGroupName.trim(),
			description: newGroupDescription.trim() || undefined
		});

		if (result.success) {
			newGroupName = '';
			newGroupDescription = '';
			showCreateGroup = false;
			showToast('Group created successfully!', 'success');
		} else {
			showToast(result.error || 'Failed to create group', 'error');
		}
	}

	async function handleJoinGroup() {
		if (!inviteCode.trim()) return;

		const result = await joinGroup(inviteCode.trim());

		if (result.success) {
			inviteCode = '';
			showJoinGroup = false;
			showToast('Successfully joined group!', 'success');
		} else {
			showToast(result.error || 'Failed to join group', 'error');
		}
	}

	async function handleGenerateInviteCode(group: GroupWithMembers) {
		// Check if we already have max invite codes (10)
		const existingCodes = groupInviteCodes[group.id] || [];
		if (existingCodes.length >= 10) {
			showToast(
				'Maximum of 10 invite codes allowed per group. Please delete unused codes first.',
				'error'
			);
			return;
		}

		const result = await generateInviteCode(group.id);

		if (result.success && result.inviteCode) {
			// Refresh the invite codes list to get the new one from DB
			await loadInviteCodes(group.id);
			showToast('New invite code created!', 'success');
		} else {
			showToast(result.error || 'Failed to create invite code', 'error');
		}
	}

	async function loadInviteCodes(groupId: string) {
		loadingInvites = groupId;

		const result = await getGroupInviteCodes(groupId);
		if (result.success && result.inviteCodes) {
			groupInviteCodes[groupId] = result.inviteCodes;
		} else {
			// Initialize empty array if fetch fails
			if (!groupInviteCodes[groupId]) {
				groupInviteCodes[groupId] = [];
			}
		}

		loadingInvites = null;
	}

	async function handleDeleteInviteCode(groupId: string, codeId: string) {
		const confirmed = confirm('Are you sure you want to delete this invite code?');
		if (!confirmed) return;

		const result = await deleteInviteCode(codeId);
		if (result.success) {
			// Remove from local state after successful deletion
			if (groupInviteCodes[groupId]) {
				groupInviteCodes[groupId] = groupInviteCodes[groupId].filter((code) => code.id !== codeId);
			}
			showToast('Invite code deleted successfully', 'success');
		} else {
			showToast(result.error || 'Failed to delete invite code', 'error');
		}
	}

	async function copyInviteCode(code: string) {
		try {
			await navigator.clipboard.writeText(code);
			showToast('Invite code copied to clipboard!', 'success');
		} catch (error) {
			showToast('Failed to copy invite code', 'error');
		}
	}

	async function toggleInviteCodes(groupId: string) {
		if (showInviteCodes === groupId) {
			showInviteCodes = null;
		} else {
			showInviteCodes = groupId;
			if (!groupInviteCodes[groupId]) {
				await loadInviteCodes(groupId);
			}
		}
	}

	async function handleUpgradeSubscription() {
		if (!selectedPlan || !$activeGroup) return;

		const result = await upgradeSubscription({
			plan: selectedPlan,
			annual: isAnnual,
			referenceId: $activeGroup.id,
			successUrl: '/dashboard?success=subscription',
			cancelUrl: '/dashboard?cancel=subscription',
			seats: $activeGroup.maxMembers
		});

		if (!result.success) {
			showToast(result.error || 'Failed to upgrade subscription', 'error');
		}
		// If successful, user will be redirected to Stripe Checkout
	}

	async function handleCancelSubscription() {
		if (!$activeGroup) return;

		const confirmed = confirm('Are you sure you want to cancel your subscription?');
		if (!confirmed) return;

		const result = await cancelSubscription($activeGroup.id, '/dashboard');

		if (!result.success) {
			showToast(result.error || 'Failed to cancel subscription', 'error');
		}
		// If successful, user will be redirected to Stripe Customer Portal
	}

	async function handleRemoveMember(group: GroupWithMembers, userId: string) {
		const member = group.memberships.find((m) => m.userId === userId);
		const memberName = member?.user.name || 'this member';

		const confirmed = confirm(`Are you sure you want to remove ${memberName} from ${group.name}?`);
		if (!confirmed) return;

		const result = await removeMember(group.id, userId);

		if (result.success) {
			// Refresh the groups data to show updated member count
			await loadUserGroups();
			showToast(`${memberName} has been removed from the group.`, 'success');
		} else {
			showToast(result.error || 'Failed to remove member', 'error');
		}
	}

	function selectGroup(group: GroupWithMembers) {
		activeGroup.set(group);
		loadSubscription(group.id);
	}

	function isOwner(group: GroupWithMembers): boolean {
		return group.memberships.some((m) => m.role === 'owner');
	}

	function canManageGroup(group: GroupWithMembers): boolean {
		return group.memberships.some((m) => m.role === 'owner' || m.role === 'admin');
	}
</script>

<div class="space-y-8">
	<div class="mb-8 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<button
				class="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-md transition-all hover:bg-indigo-500 hover:shadow-lg"
				onclick={() => (showCreateGroup = true)}
			>
				Create Group
			</button>
			<button
				class="rounded-lg border border-slate-700 bg-slate-800/80 px-6 py-3 font-medium text-white transition-all hover:bg-slate-700 hover:shadow-lg"
				onclick={() => (showJoinGroup = true)}
			>
				Join Group
			</button>
		</div>
	</div>

	<!-- Groups List -->
	<div class="mb-8 grid gap-6">
		{#each $userGroups as group}
			<div
				class="rounded-lg border border-slate-700 bg-slate-800/70 p-6 shadow-xl transition-all hover:bg-slate-800"
				class:active={$activeGroup?.id === group.id}
			>
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-xl font-bold text-white">{group.name}</h3>
					<span class="rounded-full bg-slate-700 px-3 py-1 text-sm text-slate-300"
						>{group.memberCount}/{group.maxMembers} members</span
					>
				</div>

				{#if group.description}
					<p class="mb-4 text-slate-400">{group.description}</p>
				{/if}

				<div class="mb-4">
					{#if group.subscription?.status === 'active'}
						<span
							class="inline-flex items-center rounded-full bg-green-900/50 px-3 py-1 text-sm font-medium text-green-300"
						>
							✓ Active Subscription
						</span>
					{:else if group.subscription?.status === 'trialing'}
						<span
							class="inline-flex items-center rounded-full bg-amber-900/50 px-3 py-1 text-sm font-medium text-amber-300"
						>
							⏰ Trial Period
						</span>
					{:else}
						<span
							class="inline-flex items-center rounded-full bg-red-900/50 px-3 py-1 text-sm font-medium text-red-300"
						>
							❌ No Subscription
						</span>
					{/if}
				</div>

				<div class="mb-4 flex gap-2">
					<button
						class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
						onclick={() => selectGroup(group)}
					>
						Select
					</button>

					{#if isOwner(group)}
						<button
							class="rounded-md border border-indigo-600 bg-transparent px-4 py-2 text-sm font-medium text-indigo-400 hover:bg-indigo-600 hover:text-white"
							onclick={() => toggleInviteCodes(group.id)}
						>
							{showInviteCodes === group.id ? 'Hide Invites' : 'Manage Invites'}
						</button>
					{/if}
				</div>

				<!-- Invite Codes Management -->
				{#if showInviteCodes === group.id && isOwner(group)}
					<div class="mb-4 w-full rounded-lg border border-slate-600 bg-slate-900/50 p-4">
						<div class="mb-3 flex items-center justify-between">
							<h5 class="text-sm font-semibold text-white">Invite Codes</h5>
							<button
								class="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
								onclick={() => handleGenerateInviteCode(group)}
								disabled={loadingInvites === group.id ||
									(groupInviteCodes[group.id]?.length || 0) >= 10}
							>
								{loadingInvites === group.id ? 'Loading...' : 'Create New'}
							</button>
						</div>

						{#if loadingInvites === group.id}
							<div class="text-center text-slate-400">Loading invite codes...</div>
						{:else if groupInviteCodes[group.id]?.length > 0}
							<div class="space-y-2">
								{#each groupInviteCodes[group.id] as inviteCode (inviteCode.id)}
									<div class="flex items-center justify-between rounded bg-slate-800 p-2">
										<div class="flex-1">
											<code class="text-sm text-green-400">{inviteCode.code}</code>
											<div class="text-xs text-slate-400">
												Created: {new Date(inviteCode.createdAt).toLocaleDateString()}
												{#if inviteCode.usedBy}
													• Used by {inviteCode.user?.name || 'Unknown'}
												{:else if inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()}
													• Expired
												{:else}
													• Active
												{/if}
											</div>
										</div>
										<div class="flex gap-1">
											{#if !inviteCode.usedBy}
												<button
													class="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
													onclick={() => copyInviteCode(inviteCode.code)}
												>
													Copy
												</button>
											{/if}
											<button
												class="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
												onclick={() => handleDeleteInviteCode(group.id, inviteCode.id)}
											>
												Delete
											</button>
										</div>
									</div>
								{/each}
							</div>
							<div class="mt-2 text-xs text-slate-400">
								{groupInviteCodes[group.id]?.length || 0}/10 invite codes used
							</div>
						{:else}
							<div class="text-center text-slate-400">No invite codes created yet</div>
						{/if}
					</div>
				{/if}

				<!-- Members List -->
				<div class="border-t border-slate-700 pt-4">
					<h4 class="mb-3 text-sm font-semibold tracking-wider text-slate-400 uppercase">
						Members ({group.memberCount}/{group.maxMembers})
					</h4>
					<div class="space-y-2">
						{#each group.memberships as membership}
							<div class="flex items-center justify-between rounded bg-slate-800/50 p-2">
								<div class="flex items-center gap-2">
									<div
										class="flex size-6 items-center justify-center rounded-full bg-indigo-600/30 text-xs font-bold text-white"
									>
										{membership.user.name.charAt(0).toUpperCase()}
									</div>
									<span class="text-sm text-white">{membership.user.name}</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 capitalize">
										{membership.role}
									</span>
									{#if canManageGroup(group) && membership.role !== 'owner' && membership.userId !== $activeGroup?.ownerId}
										<button
											class="rounded bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700"
											onclick={() => handleRemoveMember(group, membership.userId)}
											title="Remove {membership.user.name} from group"
										>
											Remove
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>

					{#if group.memberCount < group.maxMembers}
						<div class="mt-2 text-xs text-slate-400">
							{group.maxMembers - group.memberCount} spots available
						</div>
					{:else}
						<div class="mt-2 text-xs text-amber-400">Group is full</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Subscription Management -->
	{#if $activeGroup}
		<div class="rounded-lg border border-slate-700 bg-slate-800/70 p-6 shadow-xl">
			<h2 class="mb-4 text-2xl font-bold text-white">Subscription for {$activeGroup.name}</h2>

			{#if $hasActiveSubscription}
				<div class="text-center">
					<p class="mb-4 text-slate-300">Your group has an active subscription!</p>
					<button
						class="rounded-lg bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700"
						onclick={handleCancelSubscription}
					>
						Manage Subscription
					</button>
				</div>
			{:else}
				<div class="text-center">
					<p class="mb-4 text-slate-300">Upgrade to unlock premium features for your group!</p>
					<button
						class="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500"
						onclick={() => (showSubscriptionPlans = true)}
					>
						View Plans
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Create Group Modal -->
{#if showCreateGroup}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		role="button"
		tabindex="0"
		onclick={() => (showCreateGroup = false)}
		onkeydown={(e) => e.key === 'Escape' && (showCreateGroup = false)}
		aria-label="Close modal"
	>
		<div
			class="w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="0"
			onkeydown={(e) => {
				if (e.key === 'Escape') {
					showCreateGroup = false;
				}
			}}
			aria-modal="true"
		>
			<h2 class="mb-4 text-2xl font-bold text-white">Create New Group</h2>
			<form onsubmit={handleCreateGroup}>
				<div class="space-y-4">
					<input
						type="text"
						placeholder="Group Name"
						bind:value={newGroupName}
						required
						class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
					/>
					<textarea
						placeholder="Description (optional)"
						bind:value={newGroupDescription}
						class="w-full resize-none rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
						rows="3"
					></textarea>
				</div>
				<div class="mt-6 flex justify-end gap-3">
					<button
						type="button"
						class="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
						onclick={() => (showCreateGroup = false)}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
					>
						Create Group
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Join Group Modal -->
{#if showJoinGroup}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		role="button"
		tabindex="0"
		onclick={() => (showJoinGroup = false)}
		onkeydown={(e) => e.key === 'Escape' && (showJoinGroup = false)}
		aria-label="Close modal"
	>
		<div
			class="w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => {
				if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
					e.stopPropagation();
				}
			}}
			tabindex="0"
			role="dialog"
			aria-modal="true"
		>
			<h2 class="mb-4 text-2xl font-bold text-white">Join Group</h2>
			<form onsubmit={handleJoinGroup}>
				<input
					type="text"
					placeholder="Enter Invite Code"
					bind:value={inviteCode}
					required
					class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
				/>
				<div class="mt-6 flex justify-end gap-3">
					<button
						type="button"
						class="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
						onclick={() => (showJoinGroup = false)}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
					>
						Join Group
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Subscription Plans Modal -->
{#if showSubscriptionPlans}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		role="button"
		tabindex="0"
		onclick={() => (showSubscriptionPlans = false)}
		onkeydown={(e) => e.key === 'Escape' && (showSubscriptionPlans = false)}
		aria-label="Close modal"
	>
		<div
			class="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => {
				if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
					e.stopPropagation();
				}
			}}
			tabindex="0"
			role="dialog"
			aria-modal="true"
		>
			<h2 class="mb-6 text-2xl font-bold text-white">Choose Your Plan</h2>

			<div class="mb-6 text-center">
				<label class="inline-flex items-center">
					<input
						type="checkbox"
						bind:checked={isAnnual}
						class="rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
					/>
					<span class="ml-2 text-white">Annual Billing (Save 20%)</span>
				</label>
			</div>

			<div class="mb-6 grid gap-6 md:grid-cols-3">
				{#each $availablePlans as plan}
					<div
						class="relative rounded-lg border p-6 transition-all"
						class:border-indigo-500={plan.popular}
						class:border-slate-600={!plan.popular}
						class:bg-slate-700={plan.popular}
						class:bg-slate-800={!plan.popular}
					>
						{#if plan.popular}
							<div
								class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-sm font-medium text-white"
							>
								Most Popular
							</div>
						{/if}

						<h3 class="mb-2 text-xl font-bold text-white">{plan.displayName}</h3>
						<p class="mb-4 text-slate-400">{plan.description}</p>

						<div class="mb-4">
							{#if isAnnual && plan.annualPrice}
								<span class="text-3xl font-bold text-indigo-400">${plan.annualPrice}</span>
								<span class="text-slate-400">/year</span>
								<div class="text-sm text-green-400">
									Save ${plan.price * 12 - plan.annualPrice}/year
								</div>
							{:else}
								<span class="text-3xl font-bold text-indigo-400">${plan.price}</span>
								<span class="text-slate-400">/month</span>
							{/if}
						</div>

						<ul class="mb-6 space-y-2">
							{#each plan.features as feature}
								<li class="flex items-center text-sm text-slate-300">
									<span class="mr-2 text-green-400">✓</span>
									{feature}
								</li>
							{/each}
						</ul>

						<button
							class="w-full rounded-lg px-4 py-3 font-medium transition-all"
							class:bg-green-600={selectedPlan === plan.name}
							class:text-white={selectedPlan === plan.name}
							class:bg-indigo-600={selectedPlan !== plan.name}
							class:hover:bg-indigo-500={selectedPlan !== plan.name}
							class:hover:bg-green-500={selectedPlan === plan.name}
							onclick={() => (selectedPlan = plan.name)}
						>
							{selectedPlan === plan.name ? 'Selected' : 'Select Plan'}
						</button>
					</div>
				{/each}
			</div>

			<div class="flex justify-end gap-3">
				<button
					type="button"
					class="rounded-lg border border-slate-600 bg-slate-700 px-6 py-3 text-white hover:bg-slate-600"
					onclick={() => (showSubscriptionPlans = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-500 disabled:opacity-50"
					disabled={!selectedPlan}
					onclick={handleUpgradeSubscription}
				>
					Subscribe Now
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Toast Notifications -->
{#if toasts.length > 0}
	<div class="fixed top-4 right-4 z-[60] space-y-2">
		{#each toasts as toast (toast.id)}
			<div
				class="flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all duration-300"
				class:border-green-500={toast.type === 'success'}
				class:bg-green-900={toast.type === 'success'}
				class:border-red-500={toast.type === 'error'}
				class:bg-red-900={toast.type === 'error'}
				class:border-blue-500={toast.type === 'info'}
				class:bg-blue-900={toast.type === 'info'}
				style="background-color: rgba({toast.type === 'success'
					? '5 150 105'
					: toast.type === 'error'
						? '185 28 28'
						: '29 78 216'}, 0.9);"
			>
				<div class="flex-shrink-0">
					{#if toast.type === 'success'}
						<svg
							class="h-5 w-5 text-green-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
					{:else if toast.type === 'error'}
						<svg class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					{:else}
						<svg
							class="h-5 w-5 text-blue-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					{/if}
				</div>

				<p class="flex-1 text-sm font-medium text-white">{toast.message}</p>

				<button
					class="flex-shrink-0 rounded-full p-1 transition-colors hover:bg-white/10"
					onclick={() => removeToast(toast.id)}
					aria-label="Close notification"
				>
					<svg class="h-4 w-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		{/each}
	</div>
{/if}
