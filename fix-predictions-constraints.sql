-- Add unique constraint to prevent duplicate predictions
ALTER TABLE predictions ADD CONSTRAINT predictions_user_fixture_org_unique UNIQUE (user_id, fixture_id, organization_id);

-- Drop existing foreign key constraint and recreate with cascade delete
ALTER TABLE predictions DROP CONSTRAINT predictions_user_id_auth_user_id_fk;
ALTER TABLE predictions ADD CONSTRAINT predictions_user_id_auth_user_id_fk 
    FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE;
