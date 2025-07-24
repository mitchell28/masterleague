# Trigger.dev Setup for MasterLeague Admin Tasks

This document explains how to set up and use the new trigger.dev-powered admin tasks that replace the previous server actions.

## What's New

### 🚀 Background Task Processing

- Admin tasks now run in the background using trigger.dev
- No more blocking the UI while tasks run
- Real-time status updates with polling
- Better error handling and retry mechanisms

### 📅 Automated Scheduling

- **Auto Update Multipliers**: Runs every Monday at 6:00 AM UTC
- **Auto Recover Fixtures**: Runs every 2 hours to catch missing scores
- **Auto Update Fixture Counts**: Runs daily at 8:00 AM UTC
- **Check Fixture Schedules**: Your existing daily task at 9:00 AM UTC

### ✨ Improved User Experience

- Tasks start immediately and run in background
- Real-time status updates in the admin panel
- Enhanced dashboard with more stats
- Better error reporting and task history

## Available Tasks

### Manual Trigger Tasks (Admin Panel)

1. **Update Fixture Counts** (`update-fixture-counts`)
   - Updates predicted and completed fixture counts for all users
   - Keeps leaderboard data accurate

2. **Update Current Week Multipliers** (`update-current-week-multipliers`)
   - Updates point multipliers for the current week's fixtures
   - Runs automatically every Monday

3. **Update All Multipliers** (`update-all-multipliers`)
   - Updates point multipliers for all fixtures across all weeks
   - Heavy operation, use sparingly

4. **Recover Fixtures** (`recover-fixtures`)
   - Finds and fixes fixtures with missing scores or incorrect statuses
   - Runs automatically every 2 hours

5. **Recalculate All Points** (`recalculate-all-points`)
   - Recalculates all prediction points from scratch
   - Heavy operation for when data integrity issues occur

### Scheduled Tasks

1. **Auto Update Multipliers** (`auto-update-multipliers`)
   - Triggers current week multipliers update every Monday at 6:00 AM UTC

2. **Auto Recover Fixtures** (`auto-recover-fixtures`)
   - Triggers fixture recovery every 2 hours

3. **Auto Update Fixture Counts** (`auto-update-fixture-counts`)
   - Triggers fixture counts update daily at 8:00 AM UTC

4. **Check Fixture Schedules** (`check-fixture-schedules`)
   - Your existing task that runs daily at 9:00 AM UTC

## Setup Instructions

### 1. Environment Variables

Make sure your environment has the required trigger.dev variables:

```bash
TRIGGER_SECRET_KEY=your_trigger_secret_key
# For preview branches:
TRIGGER_PREVIEW_BRANCH=your_branch_name
```

### 2. Deploy to Trigger.dev

```bash
# Deploy your tasks to trigger.dev
npx trigger.dev@latest deploy
```

### 3. Verify Tasks are Running

1. Check the trigger.dev dashboard
2. Look for all the tasks listed above
3. Verify the scheduled tasks are properly configured

## Usage

### Admin Panel

1. Go to `/admin`
2. Click any of the action buttons
3. Watch the real-time status updates in the "Recent Activity" section
4. Tasks will show:
   - **Triggering...** → **Running** → **Success**/**Failed**

### API Endpoints

- `POST /api/admin/trigger-task` - Trigger a task manually
- `GET /api/admin/task-status?runId=...` - Check task status
- `GET /api/admin/stats` - Get fresh admin stats

## Best Practices

### When to Run Tasks

- **Fixture Counts**: After major data changes or weekly
- **Current Week Multipliers**: Start of each week (automated)
- **All Multipliers**: Only when fixture difficulty calculations change
- **Recover Fixtures**: Runs automatically, manual trigger if urgent
- **Recalculate Points**: Only for data integrity issues or major rule changes

### Monitoring

- Check the trigger.dev dashboard regularly
- Monitor the admin panel activity log
- Set up alerts for failed tasks if needed

### Performance

- Heavy tasks (All Multipliers, Recalculate Points) should be run during low-traffic periods
- Use manual triggers sparingly for heavy operations
- The automated tasks are optimized for frequency and performance

## Migration Notes

### What Changed

1. **Server Actions Removed**: Old server actions in `+page.server.ts` are gone
2. **Background Processing**: Tasks no longer block the UI
3. **Real-time Updates**: Status updates via polling instead of page refresh
4. **Better Scheduling**: Automated tasks replace manual maintenance
5. **Enhanced Dashboard**: More stats and better UX

### Benefits

- **Better UX**: No more waiting for long-running tasks
- **Reliability**: Built-in retries and error handling
- **Scalability**: Tasks can run on dedicated infrastructure
- **Monitoring**: Better visibility into task execution
- **Automation**: Reduces manual maintenance work

## Troubleshooting

### Task Not Starting

1. Check trigger.dev dashboard for errors
2. Verify environment variables are set
3. Check admin panel Recent Activity for error messages

### Task Stuck in Running

1. Tasks auto-timeout after 1 hour
2. Check trigger.dev dashboard for detailed logs
3. May need to re-deploy if task code was updated

### Polling Not Working

1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check network connectivity

### Schedule Not Working

1. Verify tasks are deployed to trigger.dev
2. Check timezone settings (all scheduled in UTC)
3. Review trigger.dev dashboard for schedule status

## Future Improvements

### Potential Enhancements

1. **WebSocket Integration**: Replace polling with real-time updates
2. **Task Queuing**: Queue multiple tasks to prevent conflicts
3. **Progress Indicators**: Show task progress for long operations
4. **Email Notifications**: Alert admins when critical tasks fail
5. **Task History**: Persistent storage of task execution history

### Additional Tasks to Consider

1. **Weekly Reports**: Generate weekly stats reports
2. **Data Validation**: Regular data integrity checks
3. **Backup Tasks**: Automated data backups
4. **Cleanup Tasks**: Remove old/stale data

---

## Quick Reference

### Task IDs for API

```typescript
const TASKS = {
	updateFixtureCounts: 'update-fixture-counts',
	updateMultipliers: 'update-current-week-multipliers',
	updateAllMultipliers: 'update-all-multipliers',
	recoverFixtures: 'recover-fixtures',
	recalculateAllPoints: 'recalculate-all-points'
};
```

### Cron Schedules

```typescript
const SCHEDULES = {
	updateMultipliers: '0 6 * * 1', // Monday 6 AM UTC
	recoverFixtures: '0 */2 * * *', // Every 2 hours
	fixtureSchedules: '0 9 * * *', // Daily 9 AM UTC
	fixtureCounts: '0 8 * * *' // Daily 8 AM UTC
};
```
