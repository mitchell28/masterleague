CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"inviter_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_invite_codes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "group_memberships" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "groups" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "group_invite_codes" CASCADE;--> statement-breakpoint
DROP TABLE "group_memberships" CASCADE;--> statement-breakpoint
DROP TABLE "groups" CASCADE;--> statement-breakpoint
ALTER TABLE "league_table" DROP CONSTRAINT "league_table_group_id_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_group_id_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "league_table" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_session" ADD COLUMN "active_organization_id" text;--> statement-breakpoint
ALTER TABLE "auth_session" ADD COLUMN "active_team_id" text;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_auth_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_table" ADD CONSTRAINT "league_table_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_table" DROP COLUMN "group_id";--> statement-breakpoint
ALTER TABLE "predictions" DROP COLUMN "group_id";