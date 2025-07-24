-- Migration: Add groups, subscriptions, and update schema for monetization
-- This migration adds support for group-based subscriptions and monetization features

-- Add stripe_customer_id to auth_user table
ALTER TABLE auth_user ADD COLUMN stripe_customer_id TEXT;

-- Create groups table
CREATE TABLE groups (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    owner_id VARCHAR NOT NULL REFERENCES auth_user(id),
    invite_code VARCHAR UNIQUE,
    max_members INTEGER DEFAULT 10 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Create group_memberships table
CREATE TABLE group_memberships (
    id VARCHAR PRIMARY KEY,
    group_id VARCHAR NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    role VARCHAR DEFAULT 'member' NOT NULL,
    joined_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    UNIQUE(group_id, user_id)
);

-- Create subscriptions table for Stripe integration
CREATE TABLE subscriptions (
    id VARCHAR PRIMARY KEY,
    plan VARCHAR NOT NULL,
    reference_id VARCHAR NOT NULL, -- references groups(id)
    stripe_customer_id VARCHAR,
    stripe_subscription_id VARCHAR,
    status VARCHAR DEFAULT 'incomplete' NOT NULL,
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    seats INTEGER DEFAULT 10,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE(reference_id)
);

-- Add group_id to predictions table
ALTER TABLE predictions ADD COLUMN group_id VARCHAR REFERENCES groups(id);

-- Add group_id to league_table
ALTER TABLE league_table ADD COLUMN group_id VARCHAR REFERENCES groups(id);

-- Create indexes for better performance
CREATE INDEX idx_groups_owner_id ON groups(owner_id);
CREATE INDEX idx_groups_invite_code ON groups(invite_code);
CREATE INDEX idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX idx_group_memberships_role ON group_memberships(role);
CREATE INDEX idx_subscriptions_reference_id ON subscriptions(reference_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_predictions_group_id ON predictions(group_id);
CREATE INDEX idx_league_table_group_id ON league_table(group_id);

-- Add composite indexes for common queries
CREATE INDEX idx_group_memberships_group_user ON group_memberships(group_id, user_id);
CREATE INDEX idx_league_table_group_user ON league_table(group_id, user_id);
CREATE INDEX idx_predictions_group_user ON predictions(group_id, user_id);
