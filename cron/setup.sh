#!/bin/bash

# Master League Cron Jobs Setup Script
# This script sets up the improved cron job system with coordination and monitoring

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="/var/log/masterleague"
CRON_SCRIPT="$PROJECT_ROOT/cron/leaderboard-cron.sh"
CRONTAB_FILE="$PROJECT_ROOT/cron/crontab.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

# Check if running as root for system-wide installation
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        log "Running as root - will install system-wide"
        USE_SUDO=""
    else
        log "Running as user - will use sudo for system operations"
        USE_SUDO="sudo"
    fi
}

# Create log directories
setup_logging() {
    log "Setting up logging directories..."
    
    $USE_SUDO mkdir -p "$LOG_DIR"
    $USE_SUDO chown $(whoami):$(whoami) "$LOG_DIR" 2>/dev/null || true
    
    # Create individual log files
    touch "$LOG_DIR/peak-updates.log"
    touch "$LOG_DIR/offpeak-updates.log"
    touch "$LOG_DIR/weekly-refresh.log"
    touch "$LOG_DIR/live-fixtures.log"
    touch "$LOG_DIR/fixture-updates.log"
    touch "$LOG_DIR/daily-check.log"
    touch "$LOG_DIR/health-failures.log"
    touch "$LOG_DIR/cache-warmup.log"
    touch "$LOG_DIR/debug.log"
    
    success "Log directories created at $LOG_DIR"
}

# Setup log rotation
setup_logrotate() {
    log "Setting up log rotation..."
    
    cat > /tmp/masterleague-logrotate << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $(whoami) $(whoami)
    postrotate
        /bin/systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF

    $USE_SUDO mv /tmp/masterleague-logrotate /etc/logrotate.d/masterleague
    success "Log rotation configured"
}

# Make cron script executable
setup_cron_script() {
    log "Setting up cron script permissions..."
    
    if [[ ! -f "$CRON_SCRIPT" ]]; then
        error "Cron script not found at $CRON_SCRIPT"
        exit 1
    fi
    
    chmod +x "$CRON_SCRIPT"
    success "Cron script made executable"
}

# Update crontab with our configuration
install_crontab() {
    log "Installing crontab configuration..."
    
    if [[ ! -f "$CRONTAB_FILE" ]]; then
        error "Crontab file not found at $CRONTAB_FILE"
        exit 1
    fi
    
    # Backup existing crontab
    if crontab -l > /dev/null 2>&1; then
        log "Backing up existing crontab..."
        crontab -l > "$PROJECT_ROOT/cron/crontab.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Update paths in crontab file
    log "Updating paths in crontab configuration..."
    sed "s|/path/to/masterleague|$PROJECT_ROOT|g" "$CRONTAB_FILE" > /tmp/masterleague-crontab
    
    # Install new crontab
    crontab /tmp/masterleague-crontab
    rm /tmp/masterleague-crontab
    
    success "Crontab installed successfully"
}

# Test API connectivity
test_api() {
    log "Testing API connectivity..."
    
    if ! command -v curl &> /dev/null; then
        warning "curl not found - skipping API test"
        return
    fi
    
    # Set default environment variables for testing
    export API_BASE_URL="${API_BASE_URL:-http://localhost:5173}"
    export ORG_ID="${ORG_ID:-8290a405-bef2-48d0-8b44-e1defdd1ae07}"
    export SEASON="${SEASON:-2025-26}"
    
    log "Testing with: $API_BASE_URL"
    
    if "$CRON_SCRIPT" test > /dev/null 2>&1; then
        success "API connectivity test passed"
    else
        warning "API connectivity test failed - check if the server is running"
        warning "Make sure to start the server with 'pnpm dev' or 'pnpm preview'"
    fi
}

# Display next steps
show_next_steps() {
    echo
    success "Cron jobs setup completed!"
    echo
    echo "📋 Next Steps:"
    echo "1. Update environment variables in crontab:"
    echo "   - Set your actual API_BASE_URL (currently using localhost)"
    echo "   - Set your CRON_API_KEY for authentication"
    echo "   - Verify ORG_ID and SEASON values"
    echo
    echo "2. Edit crontab if needed: crontab -e"
    echo
    echo "3. View current crontab: crontab -l"
    echo
    echo "4. Monitor logs:"
    echo "   - Peak updates: tail -f $LOG_DIR/peak-updates.log"
    echo "   - Health status: tail -f $LOG_DIR/health-failures.log"
    echo "   - All logs: tail -f $LOG_DIR/*.log"
    echo
    echo "5. Test individual jobs:"
    echo "   - $CRON_SCRIPT peak-leaderboard"
    echo "   - $CRON_SCRIPT daily-check"
    echo "   - $CRON_SCRIPT test"
    echo
    echo "🔧 Cron Job Features:"
    echo "- Intelligent scheduling based on peak/off-peak times"
    echo "- Coordination to prevent duplicate processing"
    echo "- Health monitoring and failure tracking"
    echo "- Automatic log rotation"
    echo "- Background cache updates"
    echo
    echo "📊 Monitor via API:"
    echo "- Health: curl $API_BASE_URL/api/cron/health"
    echo "- Status: curl '$API_BASE_URL/api/update-leaderboard?organizationId=$ORG_ID&season=$SEASON'"
}

# Main installation process
main() {
    echo "🚀 Master League Cron Jobs Setup"
    echo "=================================="
    echo
    
    check_permissions
    setup_logging
    setup_logrotate
    setup_cron_script
    install_crontab
    test_api
    show_next_steps
}

# Run main function
main "$@"
