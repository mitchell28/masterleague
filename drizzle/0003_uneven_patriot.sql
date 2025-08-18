CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "auth_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "auth"."session" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth"."user" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth"."verification" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "auth"."session" CASCADE;--> statement-breakpoint
DROP TABLE "auth"."user" CASCADE;--> statement-breakpoint
DROP TABLE "auth"."verification" CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."account" SET SCHEMA "public";
--> statement-breakpoint
ALTER TABLE "account" RENAME TO "auth_account";--> statement-breakpoint
ALTER TABLE "auth_account" DROP CONSTRAINT "account_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DROP SCHEMA "auth";
