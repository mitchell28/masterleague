CREATE TABLE "leaderboard_meta" (
	"id" varchar PRIMARY KEY NOT NULL,
	"organization_id" varchar NOT NULL,
	"season" varchar NOT NULL,
	"last_leaderboard_update" timestamp NOT NULL,
	"last_game_time" timestamp,
	"is_locked" boolean DEFAULT false NOT NULL,
	"lock_expiry" timestamp,
	"total_matches" integer DEFAULT 0 NOT NULL,
	"finished_matches" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_username_unique";--> statement-breakpoint
ALTER TABLE "leaderboard_meta" ADD CONSTRAINT "leaderboard_meta_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leaderboard_meta_org_season_idx" ON "leaderboard_meta" USING btree ("organization_id","season");--> statement-breakpoint
CREATE INDEX "leaderboard_meta_last_update_idx" ON "leaderboard_meta" USING btree ("last_leaderboard_update");--> statement-breakpoint
CREATE INDEX "leaderboard_meta_last_game_time_idx" ON "leaderboard_meta" USING btree ("last_game_time");--> statement-breakpoint
CREATE INDEX "leaderboard_meta_lock_expiry_idx" ON "leaderboard_meta" USING btree ("lock_expiry");--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_meta_org_season_unique" ON "leaderboard_meta" USING btree ("organization_id","season");--> statement-breakpoint
CREATE INDEX "fixtures_season_status_idx" ON "fixtures" USING btree ("season","status");--> statement-breakpoint
CREATE INDEX "fixtures_season_week_idx" ON "fixtures" USING btree ("season","week_id");--> statement-breakpoint
CREATE INDEX "fixtures_status_match_date_idx" ON "fixtures" USING btree ("status","match_date");--> statement-breakpoint
CREATE INDEX "fixtures_home_team_season_idx" ON "fixtures" USING btree ("home_team_id","season");--> statement-breakpoint
CREATE INDEX "fixtures_away_team_season_idx" ON "fixtures" USING btree ("away_team_id","season");--> statement-breakpoint
CREATE INDEX "fixtures_match_date_idx" ON "fixtures" USING btree ("match_date");--> statement-breakpoint
CREATE INDEX "fixtures_last_updated_idx" ON "fixtures" USING btree ("last_updated");--> statement-breakpoint
CREATE UNIQUE INDEX "fixtures_match_id_unique" ON "fixtures" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "league_table_org_season_points_idx" ON "league_table" USING btree ("organization_id","season","total_points" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "league_table_user_org_season_idx" ON "league_table" USING btree ("user_id","organization_id","season");--> statement-breakpoint
CREATE INDEX "league_table_total_points_idx" ON "league_table" USING btree ("total_points" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "league_table_last_updated_idx" ON "league_table" USING btree ("last_updated");--> statement-breakpoint
CREATE UNIQUE INDEX "league_table_user_org_season_unique" ON "league_table" USING btree ("user_id","organization_id","season");--> statement-breakpoint
CREATE INDEX "predictions_user_org_idx" ON "predictions" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "predictions_org_fixture_idx" ON "predictions" USING btree ("organization_id","fixture_id");--> statement-breakpoint
CREATE INDEX "predictions_user_fixture_idx" ON "predictions" USING btree ("user_id","fixture_id");--> statement-breakpoint
CREATE INDEX "predictions_fixture_id_idx" ON "predictions" USING btree ("fixture_id");--> statement-breakpoint
CREATE INDEX "predictions_points_idx" ON "predictions" USING btree ("points");--> statement-breakpoint
CREATE INDEX "predictions_created_at_idx" ON "predictions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "predictions_user_fixture_unique" ON "predictions" USING btree ("user_id","fixture_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitation_org_status_idx" ON "invitation" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "invitation_inviter_idx" ON "invitation" USING btree ("inviter_id");--> statement-breakpoint
CREATE INDEX "invitation_expires_at_idx" ON "invitation" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_email_org_unique" ON "invitation" USING btree ("email","organization_id","status");--> statement-breakpoint
CREATE INDEX "member_user_org_idx" ON "member" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "member_org_role_idx" ON "member" USING btree ("organization_id","role");--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "member_org_id_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_user_org_unique" ON "member" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "session_active_org_idx" ON "session" USING btree ("active_organization_id");--> statement-breakpoint
CREATE INDEX "session_ip_address_idx" ON "session" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "user_banned_idx" ON "user" USING btree ("banned");--> statement-breakpoint
CREATE INDEX "user_stripe_customer_idx" ON "user" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "user_created_at_idx" ON "user" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "username";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "display_name";