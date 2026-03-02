#!/bin/bash

# Script to sync repositories to the database
# This will populate the Explore page with at least 100 repos

echo "🔄 Starting repository sync..."
echo "This will fetch contributor-friendly repos from GitHub"
echo ""

# Get the CRON_SECRET from .env
CRON_SECRET=$(grep CRON_SECRET .env | cut -d '=' -f2)

if [ -z "$CRON_SECRET" ]; then
    echo "❌ Error: CRON_SECRET not found in .env file"
    exit 1
fi

# Call the sync API
curl -X POST http://localhost:3000/api/repos/sync \
  -H "Content-Type: application/json" \
  -d '{
    "maxRepos": 500,
    "includeExternalSources": false
  }'

echo ""
echo "✅ Sync complete! Check Settings > Repository Database for stats"
echo "📊 Visit http://localhost:3000/dashboard/explore to see repos"
