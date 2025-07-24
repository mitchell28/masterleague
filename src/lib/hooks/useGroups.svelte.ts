import { writable, derived } from 'svelte/store';
import type { Group, GroupMembership, Subscription, GroupInviteCode } from '$lib/server/db/schema';

// Types for group management
export interface GroupWithMembers extends Group {
	memberships: (GroupMembership & {
		user: {
			id: string;
			name: string;
			email: string;
			username?: string;
		};
	})[];
	subscription?: Subscription;
	memberCount: number;
}

export interface CreateGroupData {
	name: string;
	description?: string;
	maxMembers?: number;
}

export interface InviteCodeWithUser extends GroupInviteCode {
	creator: {
		id: string;
		name: string;
		email: string;
	};
	user?: {
		id: string;
		name: string;
		email: string;
	};
}

// Stores
export const userGroups = writable<GroupWithMembers[]>([]);
export const activeGroup = writable<GroupWithMembers | null>(null);
export const isLoadingGroups = writable(false);

// Derived stores
export const ownedGroups = derived(userGroups, ($userGroups) =>
	$userGroups.filter((group) => group.memberships.some((m) => m.role === 'owner'))
);

export const memberGroups = derived(userGroups, ($userGroups) =>
	$userGroups.filter((group) => group.memberships.some((m) => m.role === 'member'))
);

export const hasActiveSubscription = derived(activeGroup, ($activeGroup) => {
	if (!$activeGroup?.subscription) return false;
	return (
		$activeGroup.subscription.status === 'active' || $activeGroup.subscription.status === 'trialing'
	);
});

// Group management functions
export function useGroups() {
	const createGroup = async (
		data: CreateGroupData
	): Promise<{ success: boolean; group?: GroupWithMembers; error?: string }> => {
		try {
			const response = await fetch('/api/groups', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});

			const result = await response.json();

			if (!response.ok) {
				return { success: false, error: result.message || 'Failed to create group' };
			}

			// Update stores
			userGroups.update((groups) => [...groups, result.group]);
			activeGroup.set(result.group);

			return { success: true, group: result.group };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const joinGroup = async (
		inviteCode: string
	): Promise<{ success: boolean; group?: GroupWithMembers; error?: string }> => {
		try {
			const response = await fetch('/api/groups/join', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ inviteCode })
			});

			const result = await response.json();

			if (!response.ok) {
				return { success: false, error: result.message || 'Failed to join group' };
			}

			// Update stores
			userGroups.update((groups) => [...groups, result.group]);

			return { success: true, group: result.group };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const leaveGroup = async (groupId: string): Promise<{ success: boolean; error?: string }> => {
		try {
			const response = await fetch(`/api/groups/${groupId}/leave`, {
				method: 'POST'
			});

			const result = await response.json();

			if (!response.ok) {
				return { success: false, error: result.message || 'Failed to leave group' };
			}

			// Update stores
			userGroups.update((groups) => groups.filter((g) => g.id !== groupId));
			activeGroup.update((current) => (current?.id === groupId ? null : current));

			return { success: true };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const updateGroup = async (
		groupId: string,
		data: Partial<CreateGroupData>
	): Promise<{ success: boolean; group?: GroupWithMembers; error?: string }> => {
		try {
			const response = await fetch(`/api/groups/${groupId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});

			const result = await response.json();

			if (!response.ok) {
				return { success: false, error: result.message || 'Failed to update group' };
			}

			// Update stores
			userGroups.update((groups) => groups.map((g) => (g.id === groupId ? result.group : g)));
			activeGroup.update((current) => (current?.id === groupId ? result.group : current));

			return { success: true, group: result.group };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const loadUserGroups = async (): Promise<void> => {
		isLoadingGroups.set(true);
		try {
			const response = await fetch('/api/groups');
			const result = await response.json();

			if (response.ok) {
				userGroups.set(result.groups || []);

				// Set first group as active if none is set
				activeGroup.update((current) => {
					if (!current && result.groups?.length > 0) {
						return result.groups[0];
					}
					return current;
				});
			}
		} catch (error) {
			console.error('Failed to load user groups:', error);
		} finally {
			isLoadingGroups.set(false);
		}
	};

	const generateInviteCode = async (
		groupId: string
	): Promise<{ success: boolean; inviteCode?: string; error?: string }> => {
		try {
			const response = await fetch(`/api/groups/${groupId}/invite-codes`, {
				method: 'POST'
			});

			const result = await response.json();

			if (!response.ok) {
				return { success: false, error: result.message || 'Failed to generate invite code' };
			}

			return { success: true, inviteCode: result.code };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const getGroupInviteCodes = async (
		groupId: string
	): Promise<{ success: boolean; inviteCodes?: InviteCodeWithUser[]; error?: string }> => {
		try {
			const response = await fetch(`/api/groups/${groupId}/invite-codes`);

			const result = await response.json();

			if (!response.ok) {
				return { success: false, error: result.message || 'Failed to fetch invite codes' };
			}

			return { success: true, inviteCodes: result.inviteCodes };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const deleteInviteCode = async (
		codeId: string
	): Promise<{ success: boolean; error?: string }> => {
		try {
			const response = await fetch(`/api/groups/invite-codes/${codeId}`, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (!response.ok) {
				return { success: false, error: result.message || 'Failed to delete invite code' };
			}

			return { success: true };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const removeMember = async (
		groupId: string,
		userId: string
	): Promise<{ success: boolean; error?: string }> => {
		try {
			const response = await fetch(`/api/groups/${groupId}/members/${userId}`, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (!response.ok) {
				return { success: false, error: result.message || 'Failed to remove member' };
			}

			// Update stores
			userGroups.update((groups) =>
				groups.map((g) =>
					g.id === groupId
						? {
								...g,
								memberships: g.memberships.filter((m) => m.userId !== userId),
								memberCount: g.memberCount - 1
							}
						: g
				)
			);

			return { success: true };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	return {
		createGroup,
		joinGroup,
		leaveGroup,
		updateGroup,
		loadUserGroups,
		generateInviteCode,
		getGroupInviteCodes,
		deleteInviteCode,
		removeMember
	};
}
