ALTER TABLE "auth_account" RENAME TO "account";--> statement-breakpoint
ALTER TABLE "auth_rate_limit" RENAME TO "rateLimit";--> statement-breakpoint
ALTER TABLE "auth_session" RENAME TO "session";--> statement-breakpoint
ALTER TABLE "auth_user" RENAME TO "user";--> statement-breakpoint
ALTER TABLE "auth_verification" RENAME TO "verification";--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "auth_session_token_unique";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "auth_user_username_unique";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "auth_user_email_unique";--> statement-breakpoint
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_inviter_id_auth_user_id_fk";
--> statement-breakpoint
ALTER TABLE "league_table" DROP CONSTRAINT "league_table_user_id_auth_user_id_fk";
--> statement-breakpoint
ALTER TABLE "member" DROP CONSTRAINT "member_user_id_auth_user_id_fk";
--> statement-breakpoint
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_user_id_auth_user_id_fk";
--> statement-breakpoint
ALTER TABLE "account" DROP CONSTRAINT "auth_account_user_id_auth_user_id_fk";
--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "auth_session_user_id_auth_user_id_fk";
--> statement-breakpoint
ALTER TABLE "rateLimit" ADD COLUMN "lastRequest" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_table" ADD CONSTRAINT "league_table_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rateLimit" DROP COLUMN "window_start";--> statement-breakpoint
ALTER TABLE "rateLimit" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "rateLimit" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_token_unique" UNIQUE("token");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_email_unique" UNIQUE("email");