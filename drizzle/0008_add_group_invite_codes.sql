CREATE TABLE IF NOT EXISTS "group_invite_codes" (
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

DO $$ BEGIN
 ALTER TABLE "group_invite_codes" ADD CONSTRAINT "group_invite_codes_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_invite_codes" ADD CONSTRAINT "group_invite_codes_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_invite_codes" ADD CONSTRAINT "group_invite_codes_used_by_user_id_fk" FOREIGN KEY ("used_by") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Remove the old invite_code column from groups table (if it exists)
ALTER TABLE "groups" DROP COLUMN IF EXISTS "invite_code";
