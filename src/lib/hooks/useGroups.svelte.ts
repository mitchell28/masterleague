import { writable, derived } from 'svelte/store';

// Types for organization management
export interface OrganizationWithMembers {
	id: string;
	name: string;
	slug: string;
	logo?: string;
	metadata?: string;
	createdAt: string;
	updatedAt: string;
	memberships: (Member & {
		user: {
			id: string;
			name: string;
			email: string;
			username?: string;
		};
	})[];
	subscription?: any; // TODO: Add proper subscription type
	memberCount: number;
}

export interface Member {
	id: string;
	userId: string;
	organizationId: string;
	role: string; // owner, admin, member
	createdAt: string;
}

export interface CreateOrganizationData {
	name: string;
	slug?: string;
}

export interface InvitationWithUser {
	id: string;
	email: string;
	inviterId: string;
	organizationId: string;
	role: string;
	status: string;
	expiresAt: string;
	createdAt: string;
	updatedAt: string;
	inviter: {
		id: string;
		name: string;
		email: string;
	};
}

// Stores
export const userOrganizations = writable<OrganizationWithMembers[]>([]);
export const activeOrganization = writable<OrganizationWithMembers | null>(null);
export const isLoadingOrganizations = writable(false);

// Derived stores
export const ownedOrganizations = derived(userOrganizations, ($userOrganizations) =>
	$userOrganizations.filter((org) => org.memberships.some((m) => m.role === 'owner'))
);

export const memberOrganizations = derived(userOrganizations, ($userOrganizations) =>
	$userOrganizations.filter((org) => org.memberships.some((m) => m.role === 'member'))
);

export const hasActiveSubscription = derived(activeOrganization, ($activeOrganization) => {
	if (!$activeOrganization?.subscription) return false;
	return (
		$activeOrganization.subscription.status === 'active' ||
		$activeOrganization.subscription.status === 'trialing'
	);
});

// Organization management functions
export function useOrganizations() {
	const createOrganization = async (
		data: CreateOrganizationData
	): Promise<{ success: boolean; organization?: OrganizationWithMembers; error?: string }> => {
		try {
			const response = await fetch('/api/organizations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});

			const result = await response.json();

			if (!response.ok) {
				return { success: false, error: result.message || 'Failed to create organization' };
			}

			// Update stores
			userOrganizations.update((orgs) => [...orgs, result.organization]);
			activeOrganization.set(result.organization);

			return { success: true, organization: result.organization };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const joinOrganization = async (
		inviteCode: string
	): Promise<{ success: boolean; organization?: OrganizationWithMembers; error?: string }> => {
		try {
			const response = await fetch('/api/organizations/join', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ inviteCode })
			});

			const result = await response.json();

			if (!response.ok) {
				return { success: false, error: result.message || 'Failed to join organization' };
			}

			// Update stores
			userOrganizations.update((orgs) => [...orgs, result.organization]);

			return { success: true, organization: result.organization };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const leaveOrganization = async (
		organizationId: string
	): Promise<{ success: boolean; error?: string }> => {
		try {
			const response = await fetch(`/api/organizations/${organizationId}/leave`, {
				method: 'POST'
			});

			const result = await response.json();

			if (!response.ok) {
				return { success: false, error: result.message || 'Failed to leave organization' };
			}

			// Update stores
			userOrganizations.update((orgs) => orgs.filter((org) => org.id !== organizationId));
			activeOrganization.update((active) => (active?.id === organizationId ? null : active));

			return { success: true };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const loadUserOrganizations = async (): Promise<void> => {
		isLoadingOrganizations.set(true);
		try {
			const response = await fetch('/api/organizations');

			if (response.ok) {
				const result = await response.json();
				userOrganizations.set(result.organizations || []);

				// Set first organization as active if none is set
				const orgs = result.organizations || [];
				if (orgs.length > 0) {
					activeOrganization.update((current) => current || orgs[0]);
				}
			}
		} catch (error) {
			console.error('Error loading organizations:', error);
		} finally {
			isLoadingOrganizations.set(false);
		}
	};

	const sendInvitation = async (
		organizationId: string,
		email: string,
		role: string = 'member'
	): Promise<{ success: boolean; invitation?: any; error?: string }> => {
		try {
			const response = await fetch(`/api/organizations/${organizationId}/invite`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, role })
			});

			const result = await response.json();

			if (!response.ok) {
				return { success: false, error: result.message || 'Failed to send invitation' };
			}

			return { success: true, invitation: result.invitation };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const getInvitations = async (
		organizationId: string
	): Promise<{ success: boolean; invitations?: InvitationWithUser[]; error?: string }> => {
		try {
			const response = await fetch(`/api/organizations/${organizationId}/invitations`);

			if (!response.ok) {
				return { success: false, error: 'Failed to fetch invitations' };
			}

			const result = await response.json();
			return { success: true, invitations: result.invitations };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const cancelInvitation = async (
		invitationId: string
	): Promise<{ success: boolean; error?: string }> => {
		try {
			const response = await fetch(`/api/organizations/invitations/${invitationId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				return { success: false, error: 'Failed to cancel invitation' };
			}

			return { success: true };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const removeMember = async (
		organizationId: string,
		userId: string
	): Promise<{ success: boolean; error?: string }> => {
		try {
			const response = await fetch(`/api/organizations/${organizationId}/members/${userId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				return { success: false, error: 'Failed to remove member' };
			}

			// Update stores
			userOrganizations.update((orgs) =>
				orgs.map((org) =>
					org.id === organizationId
						? {
								...org,
								memberships: org.memberships.filter((m) => m.userId !== userId),
								memberCount: org.memberCount - 1
							}
						: org
				)
			);

			return { success: true };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	return {
		createOrganization,
		joinOrganization,
		leaveOrganization,
		loadUserOrganizations,
		sendInvitation,
		getInvitations,
		cancelInvitation,
		removeMember
	};
}
