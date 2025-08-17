# Master League Cron Integration System

This document outlines the improved cron job system with intelligent scheduling, coordination, and monitoring.

## 🎯 Overview

The cron integration system provides:

- **Intelligent Scheduling**: Peak/off-peak aware job timing
- **Conflict Prevention**: Job coordination and locking
- **Health Monitoring**: Failure tracking and recovery
- **Cache Optimization**: Smart cache invalidation and updates
- **Background Processing**: Non-blocking leaderboard updates

## 📁 File Structure

```
cron/
├── setup.sh                 # Installation and setup script
├── leaderboard-cron.sh      # Main cron job execution script
├── crontab.txt              # Cron schedule configuration
└── README.md                # This documentation

src/lib/server/cache/
├── cron-coordinator.ts      # Job coordination and health tracking
└── leaderboard-cache.ts     # Enhanced with cron awareness

src/routes/api/cron/
├── health/+server.ts        # Health monitoring API
└── coordinate/+server.ts    # Job coordination API

src/routes/leaderboard/hooks/
└── useLeaderboardRefresh.svelte.ts  # Cron-aware UI refresh
```

## 🚀 Quick Setup

1. **Install the cron system**:

   ```bash
   cd /path/to/masterleague
   ./cron/setup.sh
   ```

2. **Configure environment variables**:

   ```bash
   # Edit your crontab
   crontab -e

   # Update these variables:
   API_BASE_URL=https://your-domain.com
   CRON_API_KEY=your_secure_api_key
   ORG_ID=your_organization_id
   SEASON=2025-26
   ```

3. **Test the system**:

   ```bash
   # Test API connectivity
   ./cron/leaderboard-cron.sh test

   # Test individual jobs
   ./cron/leaderboard-cron.sh peak-leaderboard
   ./cron/leaderboard-cron.sh daily-check
   ```

## ⏰ Recommended Schedule

### Current Implementation

| Job Type                 | Schedule              | Description                               |
| ------------------------ | --------------------- | ----------------------------------------- |
| **Peak Leaderboard**     | `*/15 * * * *`        | Every 15 minutes during weekends/evenings |
| **Off-Peak Leaderboard** | `0 */2 * * *`         | Every 2 hours during weekdays             |
| **Weekly Refresh**       | `0 6 * * 1`           | Monday 6 AM - full recalculation          |
| **Live Fixtures**        | `*/5 * * * 5,6,7,1`   | Every 5 minutes on match days             |
| **Regular Fixtures**     | `*/30 * * * 2,3,4`    | Every 30 minutes on non-match days        |
| **Daily Check**          | `0 4 * * *`           | 4 AM daily maintenance                    |
| **Health Check**         | `0 18-23 * * 5,6,7,1` | Hourly during peak times                  |
| **Cache Warmup**         | `0 17 * * 5`          | Friday 5 PM before weekend games          |

### Schedule Logic

The system automatically adjusts based on:

- **Day of Week**: Weekend (Fri-Mon) vs Weekday (Tue-Thu)
- **Time of Day**: Peak hours (6pm-11pm) vs Off-peak
- **Recent Activity**: Skips if cron recently ran successfully
- **System Health**: More aggressive updates if cron is failing

## 🧠 Intelligent Processing

### Cron Health Awareness

```typescript
// The system tracks cron job health
cronHealth: 'healthy' | 'stale' | 'unknown';

// Adjusts refresh thresholds based on cron status
if (cronHealth === 'healthy') {
	threshold = 30 * 60 * 1000; // 30 minutes - rely on cron
} else if (cronHealth === 'stale') {
	threshold = 20 * 60 * 1000; // 20 minutes - be more aggressive
}
```

### Peak Time Detection

```typescript
// Peak times: Weekends (Fri-Mon) or evenings (6pm-11pm)
const isPeakTime = dayOfWeek >= 5 || dayOfWeek <= 1 || (hour >= 18 && hour <= 23);

if (isPeakTime) {
	threshold = 15 * 60 * 1000; // 15 minutes during peak
} else {
	threshold = 45 * 60 * 1000; // 45 minutes during off-peak
}
```

## 🔒 Job Coordination

### Lock System

Prevents duplicate processing:

```bash
# Example: Leaderboard update acquires lock
Lock Key: cron:lock:leaderboard:org-id:season
TTL: 300 seconds (5 minutes)
```

### Health Tracking

Monitors job execution:

```bash
# Health keys track job status
cron:health:leaderboard-peak:last_run
cron:health:leaderboard-peak:last_success
cron:health:leaderboard-peak:failures
```

## 📊 Monitoring

### Health API

```bash
# Get overall cron health
curl http://localhost:5173/api/cron/health

# Get specific job health
curl "http://localhost:5173/api/cron/health?jobType=leaderboard-peak"
```

Response:

```json
{
	"success": true,
	"overallHealth": "healthy",
	"healthyJobs": 7,
	"totalJobs": 7,
	"healthPercentage": 100,
	"jobs": {
		"leaderboard-peak": {
			"lastRun": "2025-08-17T12:00:00Z",
			"lastSuccess": "2025-08-17T12:00:00Z",
			"consecutiveFailures": 0,
			"isHealthy": true,
			"status": "healthy"
		}
	}
}
```

### Log Monitoring

```bash
# Monitor all logs
tail -f /var/log/masterleague/*.log

# Monitor specific job type
tail -f /var/log/masterleague/peak-updates.log

# Check for failures
tail -f /var/log/masterleague/health-failures.log
```

## 🎛️ Configuration

### Environment Variables

```bash
# Required
API_BASE_URL=http://localhost:5173     # Your API base URL
ORG_ID=your-org-id                     # Organization ID
SEASON=2025-26                         # Current season

# Optional
CRON_API_KEY=your-api-key             # API authentication
MAILTO=admin@example.com              # Email for cron notifications
```

### Job Parameters

Each cron job can be customized:

```bash
# Peak time updates (adjust frequency)
*/15 * * * * -> */10 * * * *  # Every 10 minutes instead of 15

# Off-peak updates (adjust hours)
0 */2 * * * -> 0 8,12,16,20 * * *  # Specific hours instead of every 2
```

## 🔧 Customization

### Adding New Job Types

1. **Update cron script**:

   ```bash
   # Add new function in leaderboard-cron.sh
   custom_job() {
       log "Running custom job"
       # Your custom logic here
   }
   ```

2. **Add to case statement**:

   ```bash
   case "$1" in
       "custom-job")
           custom_job
           ;;
   esac
   ```

3. **Add to crontab**:
   ```bash
   # Custom job every hour
   0 * * * * /path/to/leaderboard-cron.sh custom-job
   ```

### Adjusting Thresholds

Modify intelligent processing thresholds:

```typescript
// In intelligentProcessor.ts
const PEAK_THRESHOLD = 15 * 60 * 1000; // 15 minutes
const OFF_PEAK_THRESHOLD = 45 * 60 * 1000; // 45 minutes
const CRON_FRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes
```

## 🚨 Troubleshooting

### Common Issues

1. **Jobs not running**:

   ```bash
   # Check cron service
   sudo systemctl status cron

   # Check crontab
   crontab -l

   # Check logs
   tail -f /var/log/masterleague/debug.log
   ```

2. **API authentication failures**:

   ```bash
   # Test API manually
   curl -H "Authorization: Bearer $CRON_API_KEY" \
        http://localhost:5173/api/cron/health
   ```

3. **Lock conflicts**:

   ```bash
   # Check lock status
   curl "http://localhost:5173/api/cron/coordinate?lockType=leaderboard&identifier=org-id:season"
   ```

4. **High failure rate**:

   ```bash
   # Check health status
   curl http://localhost:5173/api/cron/health

   # Review error logs
   grep -i error /var/log/masterleague/*.log
   ```

### Performance Tuning

1. **Too frequent updates**:
   - Increase intervals during off-peak times
   - Reduce peak time frequency if system load is high

2. **Cache misses**:
   - Add cache warmup jobs before peak times
   - Adjust TTL values in leaderboard-cache.ts

3. **Lock timeouts**:
   - Increase CRON_LOCK_TTL if jobs take longer
   - Add more granular locking per organization

## 🎯 Benefits

### Performance Improvements

- **Reduced API calls**: Intelligent caching prevents unnecessary updates
- **Load balancing**: Peak/off-peak scheduling distributes system load
- **Cache efficiency**: Background updates keep cache warm

### Reliability Enhancements

- **Conflict prevention**: Locking prevents duplicate processing
- **Failure recovery**: Health monitoring enables automatic recovery
- **Monitoring**: Comprehensive logging and health tracking

### User Experience

- **Fast responses**: Cache-first strategy with database fallback
- **Real-time updates**: Peak time scheduling during active periods
- **Consistent data**: Coordinated updates prevent stale information

## 📈 Metrics to Monitor

- **Cache hit rate**: Should be >80% during normal operation
- **Job success rate**: Should be >95% for healthy system
- **Response times**: <100ms for cached, <500ms for database fallback
- **Lock contention**: <5% of jobs should encounter locks
- **Health recovery**: Failed jobs should recover within 3 attempts

This improved cron system ensures reliable, efficient, and coordinated leaderboard updates while providing comprehensive monitoring and easy customization options! 🚀
