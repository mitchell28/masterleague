#!/bin/bash

# Trigger.dev Deployment Script for MasterLeague
# This script helps deploy your new admin tasks to trigger.dev

echo "🚀 MasterLeague Trigger.dev Deployment"
echo "======================================"

# Check if trigger.dev CLI is installed
if ! command -v trigger.dev &> /dev/null; then
    echo "❌ trigger.dev CLI not found. Installing..."
    npm install -g @trigger.dev/cli@latest
fi

# Check environment variables
echo "🔍 Checking environment variables..."
if [ -z "$TRIGGER_SECRET_KEY" ]; then
    echo "⚠️  TRIGGER_SECRET_KEY not set"
    echo "   Please set it in your .env file or environment"
    echo "   Get it from: https://cloud.trigger.dev/[your-project]/environment-&-api-keys"
    exit 1
fi

echo "✅ Environment variables OK"

# Build the project first
echo "🔨 Building project..."
npm run build

# Deploy to trigger.dev
echo "🚀 Deploying to trigger.dev..."
npx trigger.dev@latest deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Check the trigger.dev dashboard: https://cloud.trigger.dev"
echo "2. Verify all tasks are showing up"
echo "3. Test the admin panel at /admin"
echo "4. Check the scheduled tasks are configured properly"
echo ""
echo "📚 For more info, see TRIGGER_SETUP.md"
