# Fixture Status Migration

This guide explains how to migrate the fixture statuses in the database to use the full range of status values from the Football-Data.org API.

## Background

We're updating the fixture status field to use the exact status values from the Football-Data.org API:

- `SCHEDULED`: A match has been scheduled but is not yet confirmed with an exact time
- `TIMED`: A match is confirmed with a specific date and time
- `IN_PLAY`: A match is currently being played
- `PAUSED`: A match is paused (halftime, etc.)
- `FINISHED`: A match has completed
- `SUSPENDED`: A match has been suspended
- `POSTPONED`: A match has been postponed to a later date
- `CANCELLED`: A match has been cancelled
- `AWARDED`: A match has been awarded to one of the teams

This replaces our simplified status values (`upcoming`, `live`, `completed`).

## Migration Steps

1. Ensure you have the latest code from the repository
2. Make sure you have the `.env` file with your database credentials
3. Run the migration script:

```bash
# Navigate to the project directory
cd masterleague

# Run the migration script
npx tsx src/lib/scripts/update-fixture-statuses.ts
```

The script will:

- Find all fixtures in the database
- Update the status values to the new format
- Report how many fixtures were updated

## Verification

After running the migration, check the database to verify the fixtures have been updated:

```sql
-- Check the distinct status values (should have new API values)
SELECT DISTINCT status FROM fixtures;
```

## Changes in the Application

The application now:

1. Uses original Football-Data.org API status values
2. Shows all fixtures for the current week
3. Only updates fixture status when needed (for today's games or live games)
4. Only allows predictions for non-started games (SCHEDULED or TIMED status)
5. Prevents predictions 1 hour before kickoff
6. Shows live games with real-time score updates

## Troubleshooting

If you encounter any issues with the migration:

1. Check the application logs for errors
2. Verify your database connection is working
3. Ensure your database user has proper permissions to update the fixtures table
