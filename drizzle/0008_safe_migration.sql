-- Safe migration strategy for adding groups to existing data
-- This script will:
-- 1. Create the new tables
-- 2. Create a default group for existing users
-- 3. Migrate existing data to the default group
-- 4. Then add the required constraints

-- Step 1: Create new tables first
CREATE TABLE IF NOT EXISTS "groups" (
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "description" text,
    "owner_id" varchar NOT NULL,
    "invite_code" varchar,
    "max_members" integer DEFAULT 10 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp NOT NULL,
    "updated_at" timestamp NOT NULL,
    CONSTRAINT "groups_invite_code_unique" UNIQUE("invite_code")
);

CREATE TABLE IF NOT EXISTS "group_memberships" (
    "id" varchar PRIMARY KEY NOT NULL,
    "group_id" varchar NOT NULL,
    "user_id" varchar NOT NULL,
    "role" varchar DEFAULT 'member' NOT NULL,
    "joined_at" timestamp NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" varchar PRIMARY KEY NOT NULL,
    "plan" varchar NOT NULL,
    "reference_id" varchar NOT NULL,
    "stripe_customer_id" varchar,
    "stripe_subscription_id" varchar,
    "status" varchar DEFAULT 'incomplete' NOT NULL,
    "period_start" timestamp,
    "period_end" timestamp,
    "cancel_at_period_end" boolean DEFAULT false,
    "seats" integer DEFAULT 10,
    "trial_start" timestamp,
    "trial_end" timestamp,
    "created_at" timestamp NOT NULL,
    "updated_at" timestamp NOT NULL
);

-- Step 2: Add stripe_customer_id to auth_user if not exists
ALTER TABLE "auth_user" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;

-- Step 3: Create a default group for each user who has data
DO $$
DECLARE
    user_record RECORD;
    default_group_id varchar;
    membership_id varchar;
BEGIN
    -- Create default groups for users who have predictions or league table entries
    FOR user_record IN 
        SELECT DISTINCT u.id, u.name, u.email
        FROM auth_user u
        WHERE EXISTS (
            SELECT 1 FROM predictions p WHERE p.user_id = u.id
        ) OR EXISTS (
            SELECT 1 FROM league_table lt WHERE lt.user_id = u.id
        )
    LOOP
        -- Generate IDs (you might want to use a proper ID generation function)
        default_group_id := 'group_' || user_record.id;
        membership_id := 'membership_' || user_record.id;
        
        -- Create default group for this user
        INSERT INTO groups (
            id, name, description, owner_id, invite_code, 
            max_members, is_active, created_at, updated_at
        ) VALUES (
            default_group_id,
            COALESCE(user_record.name, 'My Group') || '''s League',
            'Default group created during migration',
            user_record.id,
            'MIGRATE' || user_record.id,
            10,
            true,
            NOW()::timestamp without time zone,
            NOW()::timestamp without time zone
        ) ON CONFLICT (id) DO NOTHING;
        
        -- Create membership for the user
        INSERT INTO group_memberships (
            id, group_id, user_id, role, joined_at, is_active
        ) VALUES (
            membership_id,
            default_group_id,
            user_record.id,
            'owner',
            NOW()::timestamp without time zone,
            true
        ) ON CONFLICT DO NOTHING;
        
    END LOOP;
END $$;

-- Step 4: Add group_id columns with default values first
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "group_id" varchar;
ALTER TABLE "league_table" ADD COLUMN IF NOT EXISTS "group_id" varchar;

-- Step 5: Update existing data to use default groups
UPDATE predictions 
SET group_id = 'group_' || user_id 
WHERE group_id IS NULL;

UPDATE league_table 
SET group_id = 'group_' || user_id 
WHERE group_id IS NULL;

-- Step 6: Now make the columns NOT NULL
ALTER TABLE "predictions" ALTER COLUMN "group_id" SET NOT NULL;
ALTER TABLE "league_table" ALTER COLUMN "group_id" SET NOT NULL;

-- Step 7: Add foreign key constraints
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_groups_id_fk" 
    FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_user_id_auth_user_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_auth_user_id_fk" 
    FOREIGN KEY ("owner_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "league_table" ADD CONSTRAINT "league_table_group_id_groups_id_fk" 
    FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "predictions" ADD CONSTRAINT "predictions_group_id_groups_id_fk" 
    FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_reference_id ON subscriptions(reference_id);
CREATE INDEX IF NOT EXISTS idx_predictions_group_id ON predictions(group_id);
CREATE INDEX IF NOT EXISTS idx_league_table_group_id ON league_table(group_id);
