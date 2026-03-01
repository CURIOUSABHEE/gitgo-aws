# Contributor-Friendly Repository Pipeline

A comprehensive data pipeline that fetches, filters, scores, and stores high-quality contributor-friendly open source projects from GitHub and external sources.

## Overview

This pipeline automatically discovers and maintains a curated database of repositories that are welcoming to new contributors, based on multiple quality indicators.

## Features

- **GitHub API Integration**: Searches for repos with good-first-issue and help-wanted labels
- **Quality Scoring**: 0-100 score based on stars, recency, issues, documentation, and CI/CD
- **Rate Limiting**: Intelligent handling of GitHub API rate limits (5000 req/hour)
- **Batch Processing**: Efficient pagination and bulk database operations
- **External Sources**: Integration with goodfirstissue.dev and up-for-grabs.net
- **Automatic Sync**: Scheduled resync every 7 days via cron job
- **Stale Detection**: Marks repos not synced in 30 days as archived

## Architecture

### Components

1. **MongoDB Model** (`models/ContributorFriendlyRepo.ts`)
   - Stores repository data with quality scores
   - Indexed for efficient queries by language, score, and date

2. **Quality Scorer** (`lib/repo-scorer.ts`)
   - Calculates 0-100 score based on:
     - Stars (20%): Logarithmic scale to avoid over-weighting popular repos
     - Recency (20%): Days since last push
     - Good First Issues (25%): Number of beginner-friendly issues
     - Contributing File (15%): Has CONTRIBUTING.md
     - CI/CD (10%): Has GitHub Actions workflows
     - Activity (10%): Open issues count

3. **Repository Fetcher** (`lib/repo-fetcher.ts`)
   - Searches GitHub with multiple queries
   - Handles pagination (up to 10,000 repos)
   - Respects rate limits with automatic retry/sleep
   - Fetches detailed repo metadata

4. **Database Operations** (`lib/repo-db-operations.ts`)
   - Upsert repos (insert new, update existing)
   - Mark stale repos as archived
   - Query repos with filters
   - Get statistics

5. **External Sources** (`lib/external-sources.ts`)
   - Fetches from up-for-grabs.net API
   - Validates and enriches with GitHub data
   - Deduplicates across sources

6. **API Endpoints**
   - `POST /api/repos/sync`: Manual trigger (requires auth)
   - `GET /api/repos/sync`: Get sync statistics
   - `GET /api/cron/sync-repos`: Scheduled cron job

## Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# GitHub Personal Access Token
# Create at: https://github.com/settings/tokens
# Required scopes: repo, read:org
GITHUB_TOKEN=your_github_personal_access_token_here

# Cron Job Secret
# Generate with: openssl rand -base64 32
CRON_SECRET=your_secure_random_secret_here

# MongoDB (already configured)
MONGODB_URI=your_mongodb_connection_string
```

### 2. MongoDB Indexes

Indexes are automatically created by the Mongoose schema. No manual setup required.

### 3. Vercel Cron (for automatic sync)

The `vercel.json` file is already configured to run the sync every Sunday at midnight:

```json
{
  "crons": [{
    "path": "/api/cron/sync-repos",
    "schedule": "0 0 * * 0"
  }]
}
```

When deploying to Vercel:
1. Add `GITHUB_TOKEN` and `CRON_SECRET` to environment variables
2. Vercel will automatically set up the cron job
3. Add `CRON_SECRET` as authorization header in Vercel cron settings

### 4. Alternative Cron Setup (non-Vercel)

If not using Vercel, set up a cron job using:

**Option A: cron-job.org**
1. Create account at https://cron-job.org
2. Add job with URL: `https://your-domain.com/api/cron/sync-repos`
3. Schedule: `0 0 * * 0` (every Sunday at midnight)
4. Add header: `Authorization: Bearer YOUR_CRON_SECRET`

**Option B: GitHub Actions**
Create `.github/workflows/sync-repos.yml`:

```yaml
name: Sync Repositories
on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Sync
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/sync-repos
```

## Usage

### Manual Sync

Trigger a manual sync (requires authentication):

```bash
curl -X POST https://your-domain.com/api/repos/sync \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "maxRepos": 10000,
    "includeExternalSources": true
  }'
```

Response:
```json
{
  "success": true,
  "duration": 1234,
  "fetched": 5000,
  "upsertResult": {
    "inserted": 3000,
    "updated": 1500,
    "skipped": 500,
    "errors": 0
  },
  "archivedCount": 50,
  "stats": {
    "total": 8000,
    "active": 7950,
    "archived": 50,
    "byLanguage": {
      "JavaScript": 2000,
      "Python": 1500,
      "TypeScript": 1200
    },
    "avgQualityScore": 65.5
  }
}
```

### Get Statistics

```bash
curl https://your-domain.com/api/repos/sync
```

### Query Repositories

Use the MongoDB model directly in your code:

```typescript
import ContributorFriendlyRepo from "@/models/ContributorFriendlyRepo"

// Get top 10 JavaScript repos
const repos = await ContributorFriendlyRepo.find({
  language: "JavaScript",
  syncStatus: "active",
  qualityScore: { $gte: 60 }
})
  .sort({ qualityScore: -1, stargazersCount: -1 })
  .limit(10)

// Get repos with good first issues
const beginnerRepos = await ContributorFriendlyRepo.find({
  goodFirstIssueCount: { $gt: 0 },
  syncStatus: "active"
})
  .sort({ goodFirstIssueCount: -1 })
  .limit(20)
```

## Quality Score Breakdown

### Scoring Formula

| Factor | Weight | Calculation |
|--------|--------|-------------|
| Stars | 20% | Logarithmic: 100 stars = 5pts, 10k+ stars = 20pts |
| Recency | 20% | <7 days = 20pts, <30 days = 18pts, <90 days = 15pts |
| Good First Issues | 25% | Linear: 1 issue = 2pts, 20+ issues = 25pts |
| Contributing File | 15% | Has CONTRIBUTING.md = 15pts |
| CI/CD | 10% | Has .github/workflows = 10pts |
| Activity | 10% | Based on open issues: 20-50 = 8pts, 50-100 = 10pts |

### Quality Tiers

- **Excellent** (80-100): Top-tier repos with great documentation and active maintenance
- **Good** (60-79): Solid repos with good contributor support
- **Fair** (40-59): Acceptable repos, may lack some features
- **Poor** (<40): Not stored in database

## Rate Limiting

The pipeline respects GitHub's rate limits:

- **5000 requests/hour** for authenticated requests
- Automatic sleep when limit is low (<100 remaining)
- Small delays between requests (1s every 10 requests)
- Progress logging every 100 repos

## Performance

Expected performance (with good network):

- **Fetch**: ~2-3 hours for 10,000 repos (with rate limiting)
- **Score & Store**: ~5-10 minutes for 10,000 repos
- **Total**: ~2-3 hours for full sync

## Monitoring

Check logs for:

```
[RepoFetcher] Starting fetch, target: 10000 repos
[RepoFetcher] Searching with query: label:"good-first-issue"...
[RepoFetcher] Found 3000 new repos, total: 3000
[RepoFetcher] Rate limit low (95), sleeping for 3600s
[DB] Processing 3000 repositories
[DB] Progress: 1000 inserted, 500 updated, 200 skipped
[DB] Complete: 2500 inserted, 400 updated, 100 skipped, 0 errors
[Sync] Pipeline complete in 7200s
```

## Troubleshooting

### Rate Limit Exceeded

If you hit rate limits:
1. Wait for reset (check `X-RateLimit-Reset` header)
2. Use multiple GitHub tokens (rotate in code)
3. Reduce `maxRepos` parameter

### Low Quality Scores

If too many repos are skipped:
1. Check scoring thresholds in `repo-scorer.ts`
2. Adjust minimum score in `repo-db-operations.ts` (default: 40)
3. Review search queries in `repo-fetcher.ts`

### Stale Data

If repos aren't updating:
1. Check cron job is running
2. Verify `CRON_SECRET` is correct
3. Check logs for errors
4. Manually trigger sync via API

## Future Enhancements

- [ ] GraphQL API for more efficient GitHub queries
- [ ] Parallel fetching with multiple tokens
- [ ] Machine learning for better quality scoring
- [ ] Real-time updates via GitHub webhooks
- [ ] Integration with more curated sources
- [ ] Contributor sentiment analysis
- [ ] Project health metrics

## License

MIT
