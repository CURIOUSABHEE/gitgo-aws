import { NextRequest, NextResponse } from "next/server"
import { RepoFetcher } from "@/lib/repo-fetcher"
import { upsertRepos, markStaleRepos, getRepoStats } from "@/lib/repo-db-operations"

/**
 * GET /api/cron/sync-repos
 * Cron job endpoint to sync repositories every 7 days
 * 
 * For Vercel: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync-repos",
 *     "schedule": "0 0 * * 0"
 *   }]
 * }
 * 
 * For manual trigger: Use a service like cron-job.org or GitHub Actions
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || "your-secret-key"
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log("[Cron] Unauthorized access attempt")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log("[Cron] Starting scheduled repository sync")
    const startTime = Date.now()

    // Use GitHub token from environment
    const githubToken = process.env.GITHUB_TOKEN
    if (!githubToken) {
      throw new Error("GITHUB_TOKEN not configured")
    }

    // Step 1: Fetch repos from GitHub
    console.log("[Cron] Fetching repos from GitHub")
    const fetcher = new RepoFetcher(githubToken)
    const repos = await fetcher.fetchRepos(10000)
    
    const rateLimitStatus = fetcher.getRateLimitStatus()
    console.log(`[Cron] Fetched ${repos.length} repos`)

    // Step 2: Upsert repos to database
    console.log("[Cron] Upserting repos to database")
    const upsertResult = await upsertRepos(repos)

    // Step 3: Mark stale repos
    console.log("[Cron] Marking stale repos")
    const archivedCount = await markStaleRepos()

    // Step 4: Get updated stats
    const stats = await getRepoStats()

    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log(`[Cron] Sync complete in ${duration}s`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      fetched: repos.length,
      upsertResult,
      archivedCount,
      stats,
      rateLimit: rateLimitStatus,
    })
  } catch (error: any) {
    console.error("[Cron] Sync error:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
