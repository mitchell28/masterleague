import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../index';
import { organization as orgSchema, member } from '../schema';

/**
 * Helper function to assign users to default organization
 */
export async function assignUserToDefaultOrganization(userId: string) {
	const DEFAULT_ORG_NAME = 'Master League';
	const DEFAULT_ORG_SLUG = 'master-league';

	try {
		// Check if default organization exists
		let defaultOrg = await db
			.select()
			.from(orgSchema)
			.where(eq(orgSchema.slug, DEFAULT_ORG_SLUG))
			.limit(1);

		// Create default organization if it doesn't exist
		if (defaultOrg.length === 0) {
			const newOrgId = randomUUID();
			await db.insert(orgSchema).values({
				id: newOrgId,
				name: DEFAULT_ORG_NAME,
				slug: DEFAULT_ORG_SLUG,
				logo: null,
				metadata: JSON.stringify({ isDefault: true }),
				createdAt: new Date(),
				updatedAt: new Date()
			});

			defaultOrg = [
				{
					id: newOrgId,
					name: DEFAULT_ORG_NAME,
					slug: DEFAULT_ORG_SLUG,
					logo: null,
					metadata: JSON.stringify({ isDefault: true }),
					createdAt: new Date(),
					updatedAt: new Date()
				}
			];

			console.log(`✅ [Organization] Created default organization: ${DEFAULT_ORG_NAME}`);
		}

		// Check if user is already a member of any organization
		const existingMembership = await db
			.select()
			.from(member)
			.where(eq(member.userId, userId))
			.limit(1);

		// Add user as member if not already a member of any organization
		if (existingMembership.length === 0) {
			await db.insert(member).values({
				id: randomUUID(),
				userId,
				organizationId: defaultOrg[0].id,
				role: 'member',
				createdAt: new Date()
			});

			console.log(`✅ [Organization] Added user ${userId} to default organization`);
		} else {
			console.log(`ℹ️  [Organization] User ${userId} already belongs to an organization`);
		}
	} catch (error) {
		console.error(
			`❌ [Organization] Failed to assign user ${userId} to default organization:`,
			error
		);
		throw error;
	}
}
