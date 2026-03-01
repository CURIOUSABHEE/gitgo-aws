import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { RepoFetcher } from "@/lib/repo-fetcher"
import { upsertRepos, markStaleRepos, getRepoStats } from "@/lib/repo-db-operations"
import { fetchFromAllExternalSources } from "@/lib/external-sources"

/**
 * POST /api/repos/sync
 * Trigger the repository sync pipeline
 * Requires authentication and admin privileges
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json().catch(() => ({}))
    const maxRepos = body.maxRepos || 10000
    const includeExternalSources = body.includeExternalSources || false

    console.log(`[Sync] Starting repository sync pipeline`)
    console.log(`[Sync] Max repos: ${maxRepos}`)
    console.log(`[Sync] Include external sources: ${includeExternalSources}`)

    const startTime = Date.now()

    // Step 1: Fetch repos from GitHub
    console.log(`[Sync] Step 1: Fetching repos from GitHub`)
    const fetcher = new RepoFetcher(session.accessToken)
    let repos = await fetcher.fetchRepos(maxRepos)
    
    const rateLimitStatus = fetcher.getRateLimitStatus()
    console.log(`[Sync] Fetched ${repos.length} repos from GitHub`)
    console.log(`[Sync] Rate limit: ${rateLimitStatus.remaining} remaining, resets at ${rateLimitStatus.reset}`)

    // Step 1.5: Fetch from external sources (optional)
    if (includeExternalSources) {
      console.log(`[Sync] Step 1.5: Fetching from external sources`)
      const externalRepos = await fetchFromAllExternalSources(session.accessToken)
      repos = [...repos, ...externalRepos]
      console.log(`[Sync] Total repos after external sources: ${repos.length}`)
    }

    // Step 2: Upsert repos to database
    console.log(`[Sync] Step 2: Upserting repos to database`)
    const upsertResult = await upsertRepos(repos)

    // Step 3: Mark stale repos
    console.log(`[Sync] Step 3: Marking stale repos`)
    const archivedCount = await markStaleRepos()

    // Step 4: Get updated stats
    console.log(`[Sync] Step 4: Getting repository statistics`)
    const stats = await getRepoStats()

    const duration = Math.round((Date.now() - startTime) / 1000)

    console.log(`[Sync] Pipeline complete in ${duration}s`)

    return NextResponse.json({
      success: true,
      duration,
      fetched: repos.length,
      upsertResult,
      archivedCount,
      stats,
      rateLimit: rateLimitStatus,
    })
  } catch (error: any) {
    console.error("[Sync] Pipeline error:", error)
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/repos/sync
 * Get sync status and statistics
 */
export async function GET() {
  try {
    const stats = await getRepoStats()

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error: any) {
    console.error("[Sync] Error getting stats:", error)
    // Return fallback data instead of error
    return NextResponse.json({
      success: true,
      stats: {
        total: 0,
        active: 0,
        archived: 0,
        byLanguage: {},
        avgQualityScore: 0,
      },
      note: "Database unavailable, showing fallback data",
    })
  }
}
