ALTER TABLE "fixtures" ALTER COLUMN "status" SET DEFAULT 'TIMED';--> statement-breakpoint
ALTER TABLE "auth_user" ADD COLUMN "username" text NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_user" ADD COLUMN "display_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_user" ADD CONSTRAINT "auth_user_username_unique" UNIQUE("username");