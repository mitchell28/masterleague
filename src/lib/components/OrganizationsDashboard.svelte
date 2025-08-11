<script lang="ts">
	import {
		useOrganizations,
		useSubscription,
		userOrganizations,
		activeOrganization,
		hasActiveSubscription,
		availablePlans,
		type OrganizationWithMembers
	} from '$lib/hooks';
	import type { ActionData } from '../../routes/groups/$types';

	// Props
	let { form } = $props<{ form?: ActionData }>();

	// Local state for invitations
	let organizationInvitations = $state<Record<string, any[]>>({});
	let loadingInvites = $state<string | null>(null);

	// Toast notification state
	let toasts = $state<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>(
		[]
	);

	const {
		createOrganization,
		joinOrganization,
		loadUserOrganizations,
		sendInvitation,
		getInvitations,
		cancelInvitation,
		removeMember,
		deleteOrganization
	} = useOrganizations();

	const { upgradeSubscription, loadPlans, loadSubscription, cancelSubscription } =
		useSubscription();

	let showCreateOrganization = $state(false);
	let showJoinOrganization = $state(false);
	let showSubscriptionPlans = $state(false);
	let showInvitations = $state<string | null>(null); // Track which organization's invitations to show
	let newOrganizationName = $state('');
	let newOrganizationSlug = $state('');
	let inviteCode = $state('');
	let selectedPlan = $state('');
	let isAnnual = $state(false);
	let inviteEmail = $state('');
	let inviteRole = $state('member');

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
			await loadUserOrganizations();
			await loadPlans();

			if ($activeOrganization) {
				await loadSubscription($activeOrganization.id);
			}
		};

		loadData();
	});

	// Handle form responses
	$effect(() => {
		if (form?.success) {
			showToast(form.message || 'Action completed successfully', 'success');
		} else if (form?.error) {
			showToast(form.error, 'error');
		}
	});

	async function handleDeleteOrganization(organization: OrganizationWithMembers) {
		const confirmed = confirm(
			`Are you sure you want to delete "${organization.name}"? This action cannot be undone and will remove all members and data.`
		);

		if (!confirmed) {
			return;
		}

		const result = await deleteOrganization(organization.id);

		if (result.success) {
			showToast('Organization deleted successfully!', 'success');
		} else {
			showToast(result.error || 'Failed to delete organization', 'error');
		}
	}

	async function handleCreateOrganization() {
		if (!newOrganizationName.trim()) return;

		const result = await createOrganization({
			name: newOrganizationName.trim(),
			slug: newOrganizationSlug.trim() || undefined
		});

		if (result.success) {
			showToast('Organization created successfully!', 'success');
			showCreateOrganization = false;
			newOrganizationName = '';
			newOrganizationSlug = '';
		} else {
			showToast(result.error || 'Failed to create organization', 'error');
		}
	}

	async function handleJoinOrganization() {
		if (!inviteCode.trim()) return;

		const result = await joinOrganization(inviteCode.trim());

		if (result.success) {
			showToast('Successfully joined organization!', 'success');
			showJoinOrganization = false;
			inviteCode = '';
		} else {
			showToast(result.error || 'Failed to join organization', 'error');
		}
	}

	async function handleSendInvitation(organization: OrganizationWithMembers) {
		if (!inviteEmail.trim()) return;

		const result = await sendInvitation(organization.id, inviteEmail.trim(), inviteRole);

		if (result.success) {
			showToast('Invitation sent successfully!', 'success');
			inviteEmail = '';
			// Refresh invitations
			await loadInvitations(organization.id);
		} else {
			showToast(result.error || 'Failed to send invitation', 'error');
		}
	}

	async function loadInvitations(organizationId: string) {
		loadingInvites = organizationId;

		const result = await getInvitations(organizationId);
		if (result.success && result.invitations) {
			organizationInvitations[organizationId] = result.invitations;
		}
		// Remove the error toast - just fail silently for UX

		loadingInvites = null;
	}

	async function handleCancelInvitation(organizationId: string, invitationId: string) {
		const confirmed = confirm('Are you sure you want to cancel this invitation?');
		if (!confirmed) return;

		const result = await cancelInvitation(invitationId);

		if (result.success) {
			showToast('Invitation cancelled successfully!', 'success');
			// Remove from local state
			organizationInvitations[organizationId] =
				organizationInvitations[organizationId]?.filter((inv) => inv.id !== invitationId) || [];
		} else {
			showToast(result.error || 'Failed to cancel invitation', 'error');
		}
	}

	async function toggleInvitations(organizationId: string) {
		if (showInvitations === organizationId) {
			showInvitations = null;
		} else {
			showInvitations = organizationId;
			if (!organizationInvitations[organizationId]) {
				await loadInvitations(organizationId);
			}
		}
	}

	async function handleUpgradeSubscription() {
		if (!$activeOrganization || !selectedPlan) return;

		const upgradeData = {
			plan: selectedPlan,
			annual: isAnnual,
			referenceId: $activeOrganization.id,
			successUrl: `${window.location.origin}/organizations?success=true`,
			cancelUrl: `${window.location.origin}/organizations?cancelled=true`
		};

		const result = await upgradeSubscription(upgradeData);

		if (result.success && result.checkoutUrl) {
			window.location.href = result.checkoutUrl;
		} else {
			showToast(result.error || 'Failed to start subscription upgrade', 'error');
		}
	}

	async function handleCancelSubscription() {
		if (!$activeOrganization) return;

		const confirmed = confirm('Are you sure you want to cancel your subscription?');
		if (!confirmed) return;

		const result = await cancelSubscription(
			$activeOrganization.id,
			`${window.location.origin}/organizations`
		);

		if (result.success && result.portalUrl) {
			window.location.href = result.portalUrl;
		} else {
			showToast(result.error || 'Failed to cancel subscription', 'error');
		}
	}

	async function handleRemoveMember(organization: OrganizationWithMembers, userId: string) {
		const confirmed = confirm('Are you sure you want to remove this member?');
		if (!confirmed) return;

		const result = await removeMember(organization.id, userId);

		if (result.success) {
			showToast('Member removed successfully!', 'success');
		} else {
			showToast(result.error || 'Failed to remove member', 'error');
		}
	}

	function selectOrganization(organization: OrganizationWithMembers) {
		activeOrganization.set(organization);
		loadSubscription(organization.id);
	}

	function isOwner(organization: OrganizationWithMembers): boolean {
		return organization.memberships.some((m) => m.role === 'owner');
	}

	function canManageOrganization(organization: OrganizationWithMembers): boolean {
		return organization.memberships.some((m) => ['owner', 'admin'].includes(m.role));
	}
</script>

<div class="space-y-8">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-white">Groups</h1>
			<p class="text-slate-400">Manage your prediction groups</p>
		</div>

		<div class="flex gap-3">
			<button
				onclick={() => (showCreateOrganization = true)}
				class="bg-accent hover:bg-accent/80 px-4 py-2 text-sm font-medium text-black transition-colors"
			>
				Create Group
			</button>
			<button
				onclick={() => (showJoinOrganization = true)}
				class="bg-slate-800/50 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700/80"
			>
				Join Group
			</button>
		</div>
	</div>

	<!-- Organizations List -->
	<div class="mb-8 grid gap-6">
		{#each $userOrganizations as organization}
			<div class="border-b-4 border-indigo-600 bg-slate-800/50 p-6">
				<div class="mb-4 flex items-start justify-between">
					<div class="flex-1">
						<h3 class="text-lg font-semibold text-white">{organization.name}</h3>
						<p class="text-sm text-slate-400">@{organization.slug}</p>
						<p class="mt-2 text-sm text-slate-300">
							{organization.memberCount} member{organization.memberCount !== 1 ? 's' : ''}
						</p>
					</div>

					<div class="flex gap-2">
						{#if $activeOrganization?.id === organization.id}
							<span class="bg-accent px-3 py-1 text-xs font-medium text-black"> Active </span>
						{:else}
							<button
								onclick={() => selectOrganization(organization)}
								class="bg-slate-700/80 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-slate-700"
							>
								Select
							</button>
						{/if}

						{#if canManageOrganization(organization)}
							<button
								onclick={() => toggleInvitations(organization.id)}
								class="bg-slate-700/80 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-slate-700"
							>
								{showInvitations === organization.id ? 'Hide' : 'Invitations'}
							</button>

							{#if organization.memberships.some((m) => m.role === 'owner')}
								<button
									onclick={() => handleDeleteOrganization(organization)}
									class="bg-red-600/80 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-600"
								>
									Delete
								</button>
							{/if}
						{/if}
					</div>
				</div>

				<!-- Invitations Section (moved to top when shown) -->
				{#if showInvitations === organization.id && canManageOrganization(organization)}
					<div class="mb-4 border-b border-slate-700/70 pb-4">
						<h4 class="mb-3 text-sm font-medium text-slate-300">Send Invitation</h4>

						<div class="mb-4 flex gap-2">
							<input
								bind:value={inviteEmail}
								type="email"
								placeholder="Email address"
								class="flex-1 bg-slate-700/80 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:bg-slate-700"
							/>
							<select
								bind:value={inviteRole}
								class="bg-slate-700/80 px-3 py-2 text-sm text-white outline-none focus:bg-slate-700"
							>
								<option value="member">Member</option>
								<option value="admin">Admin</option>
							</select>
							<button
								onclick={() => handleSendInvitation(organization)}
								disabled={!inviteEmail.trim()}
								class="bg-accent hover:bg-accent/80 font-display px-4 py-2 text-sm font-medium text-black transition-colors disabled:cursor-not-allowed disabled:opacity-50"
							>
								Send
							</button>
						</div>

						{#if loadingInvites === organization.id}
							<p class="text-sm text-slate-400">Loading invitations...</p>
						{:else if organizationInvitations[organization.id]?.length > 0}
							<div class="space-y-2">
								<h5 class="text-sm font-medium text-slate-300">Pending Invitations</h5>
								{#each organizationInvitations[organization.id] as invitation}
									<div class="flex items-center justify-between bg-slate-900/50 p-3">
										<div>
											<p class="text-sm font-medium text-white">{invitation.email}</p>
											<p class="text-xs text-slate-400">Role: {invitation.role}</p>
										</div>
										<button
											onclick={() => handleCancelInvitation(organization.id, invitation.id)}
											class="text-xs text-red-400 hover:text-red-300"
										>
											Cancel
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Members List -->
				<div class="mb-4">
					<h4 class="mb-2 text-sm font-medium text-slate-300">Members</h4>
					<div class="space-y-2">
						{#each organization.memberships as membership}
							<div class="flex items-center justify-between bg-slate-900/50 p-3">
								<div>
									<p class="text-sm font-medium text-white">{membership.user.name}</p>
									<p class="text-xs text-slate-400">{membership.user.email}</p>
								</div>
								<div class="flex items-center gap-2">
									<span class="bg-slate-700/80 px-2 py-1 text-xs font-medium text-slate-300">
										{membership.role}
									</span>
									{#if canManageOrganization(organization) && membership.role !== 'owner'}
										<button
											onclick={() => handleRemoveMember(organization, membership.userId)}
											class="text-xs text-red-400 hover:text-red-300"
										>
											Remove
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/each}

		{#if $userOrganizations.length === 0}
			<div class="border-b-4 border-slate-500 bg-slate-800/50 p-8 text-center">
				<p class="text-slate-400">You're not a member of any groups yet.</p>
				<p class="mt-2 text-sm text-slate-500">Create one or join using an invite code.</p>
			</div>
		{/if}
	</div>

	<!-- Subscription Management - Hidden during testing phase -->
	<!-- 
	{#if $activeOrganization}
		<div class="border-b-4 border-indigo-600 bg-slate-800/50 p-6">
			<h3 class="mb-4 text-lg font-semibold text-white">Subscription</h3>

			{#if $hasActiveSubscription}
				<div class="mb-4 border-b-2 border-green-500 bg-green-900/50 p-4">
					<p class="text-green-100">Active subscription for {$activeOrganization.name}</p>
				</div>

				<button
					onclick={handleCancelSubscription}
					class="rounded-lg border border-red-600 bg-red-600/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/20"
				>
					Manage Subscription
				</button>
			{:else}
				<p class="mb-4 text-slate-400">No active subscription</p>
				<button
					onclick={() => (showSubscriptionPlans = true)}
					class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
				>
					Upgrade Subscription
				</button>
			{/if}
		</div>
	{/if}
	-->
</div>

<!-- Create Organization Modal -->
{#if showCreateOrganization}
	<div
		tabindex="0"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) showCreateOrganization = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') showCreateOrganization = false;
		}}
		role="dialog"
		aria-label="Close modal"
	>
		<div class="w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 p-6">
			<h2 class="mb-4 text-lg font-semibold text-white">Create Organization</h2>

			<div class="space-y-4">
				<div>
					<label for="org-name" class="mb-2 block text-sm font-medium text-slate-300">
						Organization Name
					</label>
					<input
						id="org-name"
						bind:value={newOrganizationName}
						type="text"
						placeholder="Enter organization name"
						class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400"
					/>
				</div>

				<div>
					<label for="org-slug" class="mb-2 block text-sm font-medium text-slate-300">
						Slug (optional)
					</label>
					<input
						id="org-slug"
						bind:value={newOrganizationSlug}
						type="text"
						placeholder="organization-slug"
						class="w-full bg-slate-700/80 px-3 py-2 text-white placeholder-slate-400 outline-none focus:bg-slate-700"
					/>
				</div>
			</div>

			<div class="mt-6 flex gap-3">
				<button
					onclick={handleCreateOrganization}
					disabled={!newOrganizationName.trim()}
					class="bg-accent hover:bg-accent/80 font-display flex-1 px-4 py-2 text-sm font-medium text-black transition-colors disabled:cursor-not-allowed disabled:opacity-50"
				>
					Create
				</button>
				<button
					onclick={() => (showCreateOrganization = false)}
					class="flex-1 bg-slate-700/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Join Organization Modal -->
{#if showJoinOrganization}
	<div
		tabindex="0"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) showJoinOrganization = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') showJoinOrganization = false;
		}}
		role="dialog"
		aria-label="Close modal"
	>
		<div class="w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 p-6">
			<h2 class="mb-4 text-lg font-semibold text-white">Join Organization</h2>

			<div class="space-y-4">
				<div>
					<label for="invite-code" class="mb-2 block text-sm font-medium text-slate-300">
						Invite Code
					</label>
					<input
						id="invite-code"
						bind:value={inviteCode}
						type="text"
						placeholder="Enter invite code"
						class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400"
					/>
				</div>
			</div>

			<div class="mt-6 flex gap-3">
				<button
					onclick={handleJoinOrganization}
					disabled={!inviteCode.trim()}
					class="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Join
				</button>
				<button
					onclick={() => (showJoinOrganization = false)}
					class="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Subscription Plans Modal -->
{#if showSubscriptionPlans}
	<div
		tabindex="0"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) showSubscriptionPlans = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') showSubscriptionPlans = false;
		}}
		role="dialog"
		aria-label="Close modal"
	>
		<div class="w-full max-w-4xl rounded-lg border border-slate-700 bg-slate-800 p-6">
			<h2 class="mb-6 text-lg font-semibold text-white">Choose Subscription Plan</h2>

			<div class="mb-6 flex items-center justify-center gap-4">
				<span class="text-sm text-slate-300">Monthly</span>
				<button
					aria-label="Toggle Annual Subscription"
					onclick={() => (isAnnual = !isAnnual)}
					class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {isAnnual
						? 'bg-indigo-600'
						: 'bg-slate-600'}"
				>
					<span
						class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {isAnnual
							? 'translate-x-6'
							: 'translate-x-1'}"
					></span>
				</button>
				<span class="text-sm text-slate-300">Annual</span>
				{#if isAnnual}
					<span class="rounded-full bg-green-600 px-2 py-1 text-xs font-medium text-white">
						Save 20%
					</span>
				{/if}
			</div>

			<div class="grid gap-6 md:grid-cols-3">
				{#each $availablePlans as plan}
					<div
						class="relative rounded-lg border p-6 transition-colors {plan.popular
							? 'border-indigo-500 bg-indigo-900/20'
							: 'border-slate-600 bg-slate-700'}"
					>
						{#if plan.popular}
							<div class="absolute -top-3 left-1/2 -translate-x-1/2">
								<span class="rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white">
									Most Popular
								</span>
							</div>
						{/if}

						<div class="text-center">
							<h3 class="text-lg font-semibold text-white">{plan.displayName}</h3>
							<p class="mt-2 text-sm text-slate-400">{plan.description}</p>
							<div class="mt-4">
								<span class="text-3xl font-bold text-white">
									${isAnnual ? plan.annualPrice || 0 : plan.price}
								</span>
								<span class="text-slate-400">/{isAnnual ? 'year' : 'month'}</span>
							</div>
						</div>

						<ul class="mt-6 space-y-2">
							{#each plan.features as feature}
								<li class="flex items-center text-sm text-slate-300">
									<svg class="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clip-rule="evenodd"
										></path>
									</svg>
									{feature}
								</li>
							{/each}
						</ul>

						<button
							onclick={() => {
								selectedPlan = plan.name;
								handleUpgradeSubscription();
							}}
							class="mt-6 w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors {plan.popular
								? 'bg-indigo-600 text-white hover:bg-indigo-700'
								: 'border border-slate-500 bg-slate-600 text-white hover:bg-slate-500'}"
						>
							Select Plan
						</button>
					</div>
				{/each}
			</div>

			<div class="mt-6 text-center">
				<button
					onclick={() => (showSubscriptionPlans = false)}
					class="text-sm text-slate-400 hover:text-slate-300"
				>
					Cancel
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
				class="flex items-center justify-between rounded-lg border px-4 py-3 shadow-lg {toast.type ===
				'success'
					? 'border-green-700 bg-green-900 text-green-100'
					: toast.type === 'error'
						? 'border-red-700 bg-red-900 text-red-100'
						: 'border-slate-700 bg-slate-800 text-slate-100'}"
			>
				<span class="text-sm">{toast.message}</span>
				<button
					onclick={() => removeToast(toast.id)}
					class="ml-3 text-lg opacity-70 hover:opacity-100"
				>
					×
				</button>
			</div>
		{/each}
	</div>
{/if}
