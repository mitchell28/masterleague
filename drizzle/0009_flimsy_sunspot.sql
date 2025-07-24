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
--> statement-breakpoint
ALTER TABLE "groups" DROP CONSTRAINT "groups_invite_code_unique";--> statement-breakpoint
ALTER TABLE "group_invite_codes" ADD CONSTRAINT "group_invite_codes_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invite_codes" ADD CONSTRAINT "group_invite_codes_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invite_codes" ADD CONSTRAINT "group_invite_codes_used_by_auth_user_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN "invite_code";