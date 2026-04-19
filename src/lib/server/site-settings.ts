import { db } from '$lib/server/db/index';
import { siteSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const SIGNUPS_ENABLED_KEY = 'signups_enabled';

/** Returns true when new sign-ups are allowed (default: true). */
export async function areSignupsEnabled(): Promise<boolean> {
	const row = await db
		.select()
		.from(siteSettings)
		.where(eq(siteSettings.key, SIGNUPS_ENABLED_KEY))
		.limit(1);

	if (!row[0]) return true; // default: enabled
	return row[0].value === 'true';
}

/** Sets whether new sign-ups are allowed. */
export async function setSignupsEnabled(enabled: boolean): Promise<void> {
	const value = String(enabled);
	const now = new Date();

	// Upsert
	const existing = await db
		.select()
		.from(siteSettings)
		.where(eq(siteSettings.key, SIGNUPS_ENABLED_KEY))
		.limit(1);

	if (existing.length > 0) {
		await db
			.update(siteSettings)
			.set({ value, updatedAt: now })
			.where(eq(siteSettings.key, SIGNUPS_ENABLED_KEY));
	} else {
		await db.insert(siteSettings).values({ key: SIGNUPS_ENABLED_KEY, value, updatedAt: now });
	}
}
