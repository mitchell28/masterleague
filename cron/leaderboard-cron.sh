#!/bin/bash

# Master League Cron Jobs Configuration
# Run with: chmod +x leaderboard-cron.sh && ./leaderboard-cron.sh

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:5173}"
ORG_ID="${ORG_ID:-8290a405-bef2-48d0-8b44-e1defdd1ae07}"
SEASON="${SEASON:-2025-26}"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to make authenticated API calls
api_call() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="$3"
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl -s -X POST "$API_BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $CRON_API_KEY" \
            -d "$data"
    else
        curl -s -X "$method" "$API_BASE_URL$endpoint" \
            -H "Authorization: Bearer $CRON_API_KEY"
    fi
}

# Update leaderboard function
update_leaderboard() {
    local force="${1:-false}"
    local reason="$2"
    
    log "Starting leaderboard update (force=$force, reason=$reason)"
    
    local payload="{\"organizationId\": \"$ORG_ID\", \"season\": \"$SEASON\", \"force\": $force}"
    local response=$(api_call "/api/update-leaderboard" "POST" "$payload")
    
    if echo "$response" | grep -q '"success":true'; then
        local users_updated=$(echo "$response" | grep -o '"totalUsersUpdated":[0-9]*' | cut -d':' -f2)
        local execution_time=$(echo "$response" | grep -o '"totalExecutionTime":[0-9]*' | cut -d':' -f2)
        log "✅ Leaderboard updated successfully: $users_updated users in ${execution_time}ms"
    else
        log "❌ Leaderboard update failed: $response"
    fi
}

# Update fixtures function
update_fixtures() {
    local reason="$1"
    
    log "Starting fixture update (reason=$reason)"
    
    local response=$(api_call "/api/background" "POST" '{"action": "check-fixture-schedules"}')
    
    if echo "$response" | grep -q '"success":true'; then
        log "✅ Fixture update completed successfully"
    else
        log "❌ Fixture update failed: $response"
    fi
}

# Peak time leaderboard updates (every 15 minutes during active periods)
peak_leaderboard_update() {
    local hour=$(date '+%H')
    local dow=$(date '+%u') # 1=Monday, 7=Sunday
    
    # Weekend (Fri-Mon) or evening hours (6pm-11pm)
    if [ "$dow" -ge 5 ] || [ "$dow" -le 1 ] || ([ "$hour" -ge 18 ] && [ "$hour" -le 23 ]); then
        update_leaderboard false "peak-time-update"
    else
        log "Skipping peak time update - outside active period"
    fi
}

# Off-peak leaderboard updates (every 2 hours during quiet periods)
offpeak_leaderboard_update() {
    local hour=$(date '+%H')
    local dow=$(date '+%u')
    
    # Not weekend and not evening hours
    if [ "$dow" -lt 5 ] && [ "$dow" -gt 1 ] && ([ "$hour" -lt 18 ] || [ "$hour" -gt 23 ]); then
        update_leaderboard false "off-peak-update"
    else
        log "Skipping off-peak update - in active period"
    fi
}

# Weekly refresh (forced recalculation)
weekly_refresh() {
    log "Starting weekly forced refresh"
    update_leaderboard true "weekly-refresh"
}

# Daily schedule check
daily_schedule_check() {
    log "Starting daily schedule check"
    update_fixtures "daily-check"
    
    # Also do a leaderboard update to catch any overnight changes
    update_leaderboard false "daily-catch-up"
}

# Fixture updates for live games
live_fixture_update() {
    log "Starting live fixture update"
    update_fixtures "live-games"
}

# Main execution based on argument
case "$1" in
    "peak-leaderboard")
        peak_leaderboard_update
        ;;
    "offpeak-leaderboard")
        offpeak_leaderboard_update
        ;;
    "weekly-refresh")
        weekly_refresh
        ;;
    "daily-check")
        daily_schedule_check
        ;;
    "live-fixtures")
        live_fixture_update
        ;;
    "test")
        log "Testing API connectivity..."
        response=$(api_call "/api/update-leaderboard?organizationId=$ORG_ID&season=$SEASON")
        log "Test response: $response"
        ;;
    *)
        echo "Usage: $0 {peak-leaderboard|offpeak-leaderboard|weekly-refresh|daily-check|live-fixtures|test}"
        echo ""
        echo "Cron schedule examples:"
        echo "# Every 15 minutes during peak times"
        echo "*/15 * * * * /path/to/leaderboard-cron.sh peak-leaderboard"
        echo ""
        echo "# Every 2 hours during off-peak"
        echo "0 */2 * * * /path/to/leaderboard-cron.sh offpeak-leaderboard"
        echo ""
        echo "# Weekly refresh on Monday at 6 AM"
        echo "0 6 * * 1 /path/to/leaderboard-cron.sh weekly-refresh"
        echo ""
        echo "# Daily schedule check at 4 AM"
        echo "0 4 * * * /path/to/leaderboard-cron.sh daily-check"
        echo ""
        echo "# Live fixture updates every 5 minutes"
        echo "*/5 * * * * /path/to/leaderboard-cron.sh live-fixtures"
        exit 1
        ;;
esac
