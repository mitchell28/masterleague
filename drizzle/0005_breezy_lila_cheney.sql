ALTER TABLE "auth_session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "auth_user" ADD COLUMN "role" text DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "auth_user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "auth_user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "auth_user" ADD COLUMN "ban_expires" integer;