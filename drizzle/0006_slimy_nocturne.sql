ALTER TABLE "fixtures" ADD COLUMN "last_updated" timestamp;--> statement-breakpoint
ALTER TABLE "league_table" ADD COLUMN "predicted_fixtures" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "league_table" ADD COLUMN "completed_fixtures" integer DEFAULT 0;