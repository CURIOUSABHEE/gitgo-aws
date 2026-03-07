# Deploy GitGo to AWS - Quick Start

This repository is ready for AWS Amplify deployment!

## Quick Deploy Steps

### 1. Create GitHub Repository
```bash
# You're already in the source_code directory with git initialized
# Add your new GitHub repository as remote:
git remote add origin https://github.com/YOUR_USERNAME/gitgo-aws.git
git branch -M main
git push -u origin main
```

### 2. Deploy to AWS Amplify

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "Create new app" → "Host web app"
3. Select "GitHub" and authorize
4. Select your `gitgo-aws` repository
5. Branch: `main`
6. Amplify will auto-detect `amplify.yml` ✅
7. Add these 14 environment variables:

| Variable | Value |
|----------|-------|
| `GITHUB_CLIENT_ID` | Your GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | Your GitHub OAuth Client Secret |
| `GITHUB_TOKEN` | Your GitHub Personal Access Token |
| `LINKEDIN_CLIENT_ID` | Your LinkedIn Client ID |
| `LINKEDIN_CLIENT_SECRET` | Your LinkedIn Client Secret |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Leave blank (add after first deploy) |
| `CRON_SECRET` | Run: `openssl rand -base64 32` |
| `DATABASE_MODE` | `dynamodb` |
| `GITGO_AWS_REGION` | `us-east-1` |
| `GITGO_EXECUTION_MODE` | `lambda` |
| `GITGO_S3_BUCKET_NAME` | Your S3 bucket name |
| `API_GATEWAY_URL` | Leave blank (optional) |

8. Click "Save and deploy"
9. Wait 5-10 minutes for build
10. Get your URL: `https://main.xxxxxxxx.amplifyapp.com`
11. Update `NEXTAUTH_URL` with your Amplify URL
12. Update GitHub OAuth callback: `https://YOUR_URL/api/auth/callback/github`

## Prerequisites

Before deploying, ensure you have:

- ✅ MongoDB Atlas cluster (free tier)
- ✅ 6 DynamoDB tables created
- ✅ S3 bucket for resumes
- ✅ Bedrock models enabled
- ✅ GitHub OAuth App
- ✅ LinkedIn OAuth App (optional)

## Full Documentation

For complete step-by-step instructions, see:
- `AWS_COMPLETE_DEPLOYMENT_GUIDE.md` - Detailed guide
- `AWS_DEPLOYMENT_CHECKLIST.md` - Quick checklist
- `AMPLIFY_TROUBLESHOOTING.md` - Common issues

## Architecture

```
AWS Amplify (Next.js SSR)
    ↓
DynamoDB + MongoDB Atlas + S3 + Bedrock
```

## Cost Estimate

$5-20/month for low to medium traffic

## Support

- Check CloudWatch logs for errors
- Review troubleshooting guide
- Open GitHub issue

---

**Ready to deploy?** Follow the steps above!
