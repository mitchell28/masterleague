import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb, resetDatabase } from '../database';
import { UserFactory } from '../factories';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Simulate the default organization assignment function
async function assignUserToDefaultOrganization(userId: string) {
	const db = getTestDb();
	const DEFAULT_ORG_NAME = 'Master League';
	const DEFAULT_ORG_SLUG = 'master-league';

	// Check if default organization exists
	let defaultOrg = await db
		.select()
		.from(schema.organization)
		.where(eq(schema.organization.slug, DEFAULT_ORG_SLUG))
		.limit(1);

	// Create default organization if it doesn't exist
	if (defaultOrg.length === 0) {
		defaultOrg = await db
			.insert(schema.organization)
			.values({
				id: randomUUID(),
				name: DEFAULT_ORG_NAME,
				slug: DEFAULT_ORG_SLUG,
				logo: null,
				metadata: JSON.stringify({ isDefault: true }),
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.returning();
	}

	// Check if user is already a member
	const existingMembership = await db
		.select()
		.from(schema.member)
		.where(eq(schema.member.userId, userId))
		.limit(1);

	// Add user as member if not already a member of any organization
	if (existingMembership.length === 0) {
		await db.insert(schema.member).values({
			id: randomUUID(),
			userId,
			organizationId: defaultOrg[0].id,
			role: 'member',
			createdAt: new Date()
		});
	}
}

describe('Default Organization Assignment', () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it('should assign new users to the default organization', async () => {
		const db = getTestDb();

		// Create a user
		const testUser = await UserFactory.create();

		// Simulate default organization assignment (as would happen in Better Auth callback)
		await assignUserToDefaultOrganization(testUser.id);

		// Check if user was assigned to an organization
		const userMemberships = await db
			.select()
			.from(schema.member)
			.where(eq(schema.member.userId, testUser.id));

		// Should have at least one membership
		expect(userMemberships.length).toBeGreaterThan(0);

		// Check if the default organization exists
		const organizations = await db
			.select()
			.from(schema.organization)
			.where(eq(schema.organization.slug, 'master-league'));

		expect(organizations).toHaveLength(1);
		expect(organizations[0].name).toBe('Master League');

		// Verify user is a member of the default organization
		const membership = userMemberships.find((m) => m.organizationId === organizations[0].id);
		expect(membership).toBeDefined();
		expect(membership?.role).toBe('member');
	});

	it('should not create duplicate memberships', async () => {
		const db = getTestDb();

		// Create multiple users
		const user1 = await UserFactory.create();
		const user2 = await UserFactory.create();

		// Assign both to default organization
		await assignUserToDefaultOrganization(user1.id);
		await assignUserToDefaultOrganization(user2.id);

		// Check that each user has only one membership
		const user1Memberships = await db
			.select()
			.from(schema.member)
			.where(eq(schema.member.userId, user1.id));

		const user2Memberships = await db
			.select()
			.from(schema.member)
			.where(eq(schema.member.userId, user2.id));

		expect(user1Memberships).toHaveLength(1);
		expect(user2Memberships).toHaveLength(1);

		// Both should be in the same default organization
		expect(user1Memberships[0].organizationId).toBe(user2Memberships[0].organizationId);
	});

	it('should not add user to default org if already a member elsewhere', async () => {
		const db = getTestDb();

		// Create a user
		const testUser = await UserFactory.create();

		// Create a custom organization and add user to it first
		const customOrg = await db
			.insert(schema.organization)
			.values({
				id: randomUUID(),
				name: 'Custom Org',
				slug: 'custom-org',
				logo: null,
				metadata: null,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.returning();

		await db.insert(schema.member).values({
			id: randomUUID(),
			userId: testUser.id,
			organizationId: customOrg[0].id,
			role: 'member',
			createdAt: new Date()
		});

		// Try to assign to default organization
		await assignUserToDefaultOrganization(testUser.id);

		// User should still have only one membership (to the custom org)
		const userMemberships = await db
			.select()
			.from(schema.member)
			.where(eq(schema.member.userId, testUser.id));

		expect(userMemberships).toHaveLength(1);
		expect(userMemberships[0].organizationId).toBe(customOrg[0].id);
	});
});
