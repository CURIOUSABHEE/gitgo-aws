# Repository Pipeline Quick Start Guide

Get the contributor-friendly repository pipeline up and running in 5 minutes.

## Prerequisites

- MongoDB connection (already configured)
- GitHub account with API access

## Step 1: Get GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: "GitGo Repo Sync"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:org` (Read org and team membership)
5. Click "Generate token"
6. Copy the token (starts with `ghp_`)

## Step 2: Configure Environment Variables

Add to your `.env` file:

```bash
# GitHub Personal Access Token
GITHUB_TOKEN=ghp_your_token_here

# Cron Job Secret (generate with: openssl rand -base64 32)
CRON_SECRET=your_random_secret_here
```

To generate a secure CRON_SECRET:
```bash
openssl rand -base64 32
```

## Step 3: Test the Pipeline

### Option A: Via UI (Recommended)

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: http://localhost:3000/dashboard/repo-sync

3. Click "Sync GitHub" button

4. Watch the progress in the console and UI

### Option B: Via API

```bash
# Get current stats
curl http://localhost:3000/api/repos/sync

# Trigger sync (requires authentication)
curl -X POST http://localhost:3000/api/repos/sync \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"maxRepos": 100, "includeExternalSources": false}'
```

## Step 4: Set Up Automatic Sync (Production)

### For Vercel Deployment

1. Deploy to Vercel:
   ```bash
   vercel deploy
   ```

2. Add environment variables in Vercel dashboard:
   - `GITHUB_TOKEN`
   - `CRON_SECRET`

3. The cron job is already configured in `vercel.json`:
   - Runs every Sunday at midnight
   - Endpoint: `/api/cron/sync-repos`

4. Vercel will automatically set up the cron job

### For Other Platforms

Use cron-job.org or GitHub Actions:

**cron-job.org:**
1. Create account at https://cron-job.org
2. Add job:
   - URL: `https://your-domain.com/api/cron/sync-repos`
   - Schedule: `0 0 * * 0` (every Sunday)
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`

**GitHub Actions:**
Create `.github/workflows/sync-repos.yml`:
```yaml
name: Sync Repositories
on:
  schedule:
    - cron: '0 0 * * 0'
  workflow_dispatch:

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

## Step 5: Query the Data

Use the MongoDB model in your code:

```typescript
import ContributorFriendlyRepo from "@/models/ContributorFriendlyRepo"

// Get top JavaScript repos
const repos = await ContributorFriendlyRepo.find({
  language: "JavaScript",
  syncStatus: "active",
  qualityScore: { $gte: 60 }
})
  .sort({ qualityScore: -1 })
  .limit(10)

// Get repos with good first issues
const beginnerRepos = await ContributorFriendlyRepo.find({
  goodFirstIssueCount: { $gt: 0 },
  syncStatus: "active"
})
  .sort({ goodFirstIssueCount: -1 })
  .limit(20)
```

## Expected Results

After first sync (with `maxRepos: 10000`):

- **Duration**: 2-3 hours (due to rate limiting)
- **Repos Fetched**: ~5,000-10,000
- **Repos Stored**: ~3,000-5,000 (only those with score ≥40)
- **API Requests**: ~15,000-20,000
- **Rate Limit**: Will be managed automatically

## Monitoring

Check the console for progress:

```
[RepoFetcher] Starting fetch, target: 10000 repos
[RepoFetcher] Searching with query: label:"good-first-issue"...
[RepoFetcher] Page 1/10: 100 repos fetched
[RepoFetcher] Rate limit: 4900 remaining
[DB] Processing 3000 repositories
[DB] Progress: 1000 inserted, 500 updated, 200 skipped
[Sync] Pipeline complete in 7200s
```

## Troubleshooting

### "Unauthorized" Error
- Make sure you're logged in
- Check that `GITHUB_TOKEN` is set correctly

### Rate Limit Exceeded
- Wait for reset (check console for reset time)
- Reduce `maxRepos` parameter
- The pipeline automatically handles rate limits

### No Repos Stored
- Check quality score threshold (default: 40)
- Verify search queries are returning results
- Check console logs for errors

### Cron Job Not Running
- Verify `CRON_SECRET` matches in both `.env` and cron service
- Check cron service logs
- Test endpoint manually with curl

## Next Steps

1. **Integrate with Dashboard**: Display repos on main dashboard
2. **Add Filters**: Filter by language, quality score, etc.
3. **Create API Endpoints**: Expose repos via REST API
4. **Add Search**: Full-text search across repos
5. **User Recommendations**: Match repos to user's tech stack

## Performance Tips

- **First Sync**: Run with `maxRepos: 1000` to test
- **Production**: Use `maxRepos: 10000` for comprehensive coverage
- **External Sources**: Enable only if needed (adds ~30 min)
- **Frequency**: Weekly sync is sufficient for most use cases

## Support

For issues or questions:
1. Check logs in console
2. Review `REPO_PIPELINE_README.md` for detailed docs
3. Check GitHub API rate limits: https://api.github.com/rate_limit

## Summary

You now have a fully functional pipeline that:
- ✅ Fetches contributor-friendly repos from GitHub
- ✅ Scores repos based on quality indicators
- ✅ Stores high-quality repos in MongoDB
- ✅ Syncs automatically every 7 days
- ✅ Provides UI for monitoring and manual triggers

Happy coding! 🚀
