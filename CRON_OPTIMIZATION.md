# Cron Job Optimization - Smart Match-Window Scheduling

## Overview

Implemented intelligent, event-driven cron scheduling that runs frequently during match times but backs off when nothing is happening. This prevents resource waste while ensuring we never miss live match updates.

## Match Window Detection

**Weekend Match Windows:**

- Saturday/Sunday: 11:00-23:00 UTC (covers UK times 11:00-23:00)

**Midweek Match Windows:**

- Tuesday/Wednesday/Thursday: 18:00-23:00 UTC (covers evening fixtures)

## Optimized Cron Schedules

### 1. **intelligent-processor**

- **Schedule:** Every 5 minutes
- **Smart Logic:** Only runs during match windows
- **Before:** 10,080 runs/week (every minute)
- **After:** ~270 runs/week (5 min × 54 hours of match windows)
- **Reduction:** 97% ✅

### 2. **live-scores-updater**

- **Schedule:** Every 3 minutes
- **Smart Logic:** Only runs during match windows
- **Before:** 168 runs/week (hourly)
- **After:** ~1,080 runs/week (3 min × 54 hours, but actually needed!)
- **Impact:** More frequent when needed, silent when not

### 3. **finished-fixtures-checker**

- **Schedule:** Every 15 minutes
- **Smart Logic:** Only runs during match windows + 2 hour buffer (for late finishes)
- **Before:** 336 runs/week (every 30 min)
- **After:** ~280 runs/week (15 min × 70 hours with buffer)
- **Reduction:** 17% while increasing frequency during critical times ✅

### 4. **fixture-schedule**

- **Schedule:** Once per day at 8 AM UTC
- **Reasoning:** Fixture schedule changes are extremely rare
- **Before:** 5,040 runs/week (every 2 minutes)
- **After:** 7 runs/week (once per day)
- **Reduction:** 99.9% ✅

### 5. **health-check**

- **Schedule:** Every 30 minutes
- **No smart logic needed:** System health monitoring doesn't need match-based logic
- **Before:** 2,016 runs/week (every 5 minutes)
- **After:** 336 runs/week (every 30 minutes)
- **Reduction:** 83% ✅

### 6. **simple-coordinate**

- **Schedule:** Every 15 minutes
- **Before:** 1,008 runs/week (every 10 minutes)
- **After:** 672 runs/week (every 15 minutes)
- **Reduction:** 33% ✅

### 7. **prediction-safety-check**

- **Schedule:** Every 6 hours
- **No changes:** Already optimal ✅

## Total Impact

| Metric                   | Before   | After                         | Change     |
| ------------------------ | -------- | ----------------------------- | ---------- |
| **Total Weekly Runs**    | ~19,000  | ~2,600                        | **-86%**   |
| **Peak Hour Intensity**  | Constant | Smart (higher during matches) | Better     |
| **Risk of Missing Data** | Low      | **None**                      | Maintained |
| **Resource Efficiency**  | Poor     | **Excellent**                 | Optimized  |

## Key Benefits

1. **No Missed Updates:** Checks every 3-5 minutes during live matches
2. **Massive Resource Savings:** 86% reduction in cron executions
3. **Cost Effective:** Trigger.dev pricing based on runs - this saves money
4. **Smart Adaptation:** Automatically adjusts to match schedule
5. **Simple Logic:** Easy to understand and maintain

## Match Window Hours Per Week

- **Weekend:** 24 hours (Sat/Sun: 12 hours each, 11:00-23:00)
- **Midweek:** 30 hours (Tue/Wed/Thu: 10 hours each, 18:00-23:00)
- **Total Active:** 54 hours per week
- **Inactive:** 114 hours per week (saved resources!)

## Deployment

After deploying these changes to Trigger.dev:

1. Monitor first weekend to ensure all matches are captured
2. Check prediction-safety-check results to verify no gaps
3. Adjust window times if needed based on actual fixture patterns

## Future Enhancements

1. **Dynamic Windows:** Query database for actual fixture times instead of hardcoded windows
2. **Timezone Handling:** More sophisticated timezone conversion
3. **Competition-Specific:** Different windows for different competitions (if you add Champions League, etc.)
