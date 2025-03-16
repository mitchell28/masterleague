-- Add missing columns to league_table
ALTER TABLE "league_table" 
ADD COLUMN IF NOT EXISTS "predicted_fixtures" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "completed_fixtures" INTEGER DEFAULT 0; 