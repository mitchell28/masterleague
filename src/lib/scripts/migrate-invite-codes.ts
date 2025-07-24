import { db } from '$lib/server/db';
import { groupInviteCodes } from '$lib/server/db/schema';

async function runMigration() {
	try {
		console.log('Creating group_invite_codes table...');

		// Check if table exists first
		const tableExists = await db.execute(`
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = 'group_invite_codes'
			);
		`);

		if (tableExists.rows[0]?.exists) {
			console.log('Table group_invite_codes already exists');
			return;
		}

		// Create the table manually
		await db.execute(`
			CREATE TABLE "group_invite_codes" (
				"id" varchar PRIMARY KEY NOT NULL,
				"group_id" varchar NOT NULL,
				"code" varchar NOT NULL,
				"created_by" varchar NOT NULL,
				"used_by" varchar,
				"created_at" timestamp NOT NULL,
				"used_at" timestamp,
				"expires_at" timestamp,
				"is_active" boolean DEFAULT true NOT NULL,
				CONSTRAINT "group_invite_codes_code_unique" UNIQUE("code")
			);
		`);

		// Add foreign key constraints
		await db.execute(`
			ALTER TABLE "group_invite_codes" 
			ADD CONSTRAINT "group_invite_codes_group_id_groups_id_fk" 
			FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE cascade;
		`);

		await db.execute(`
			ALTER TABLE "group_invite_codes" 
			ADD CONSTRAINT "group_invite_codes_created_by_auth_user_id_fk" 
			FOREIGN KEY ("created_by") REFERENCES "auth_user"("id");
		`);

		await db.execute(`
			ALTER TABLE "group_invite_codes" 
			ADD CONSTRAINT "group_invite_codes_used_by_auth_user_id_fk" 
			FOREIGN KEY ("used_by") REFERENCES "auth_user"("id");
		`);

		// Remove old invite_code column from groups if it exists
		try {
			await db.execute(`ALTER TABLE "groups" DROP COLUMN IF EXISTS "invite_code";`);
		} catch (error) {
			console.log('invite_code column might not exist:', error.message);
		}

		console.log('Migration completed successfully!');
	} catch (error) {
		console.error('Migration failed:', error);
	}
}

runMigration();
