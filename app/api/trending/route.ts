import { NextResponse } from "next/server"
import { scrapeTrendingRepos } from "@/lib/scraper"
import { fetchFromGitHubAPI } from "@/lib/api-fallback"
import { getRedisClient } from "@/lib/redis"
import type { RepositoryData, TrendingSuccessResponse, TrendingErrorResponse } from "@/lib/types"

const CACHE_KEY = "trending:repositories"
const CACHE_TTL = 3600 // 1 hour in seconds

export async function GET() {
  try {
    const redis = getRedisClient()

    // Try to get from cache first
    if (redis) {
      try {
        const cached = await redis.get(CACHE_KEY)
        if (cached) {
          const data = JSON.parse(cached) as { repositories: RepositoryData[]; cachedAt: string }
          console.log("✅ Serving trending repos from Redis cache")
          
          const response: TrendingSuccessResponse = {
            repositories: data.repositories,
            source: "cache",
            cachedAt: data.cachedAt,
          }
          
          return NextResponse.json(response)
        }
      } catch (cacheError) {
        console.error("Redis cache read error:", cacheError)
        // Continue to fetch fresh data if cache fails
      }
    }

    let repositories: RepositoryData[] = []
    let source: "scraper" | "api" = "scraper"

    // Try scraping first
    try {
      console.log("🔍 Attempting to scrape trending repos...")
      const scrapedRepos = await scrapeTrendingRepos()
      repositories = scrapedRepos
      source = "scraper"
      console.log(`✅ Successfully scraped ${repositories.length} repos`)
    } catch (scrapeError) {
      console.error("Scraping failed:", scrapeError)
      
      // Fallback to GitHub API
      try {
        console.log("🔄 Falling back to GitHub API...")
        const apiRepos = await fetchFromGitHubAPI()
        repositories = apiRepos.map(repo => ({
          name: repo.name,
          description: repo.description,
          stars: repo.stars,
          language: repo.language,
        }))
        source = "api"
        console.log(`✅ Successfully fetched ${repositories.length} repos from API`)
      } catch (apiError) {
        console.error("GitHub API also failed:", apiError)
        throw new Error("Both scraping and API fallback failed")
      }
    }

    // Cache the results in Redis
    if (redis && repositories.length > 0) {
      try {
        const cacheData = {
          repositories,
          cachedAt: new Date().toISOString(),
        }
        await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(cacheData))
        console.log(`✅ Cached ${repositories.length} repos in Redis (TTL: ${CACHE_TTL}s)`)
      } catch (cacheError) {
        console.error("Failed to cache in Redis:", cacheError)
        // Don't fail the request if caching fails
      }
    }

    const response: TrendingSuccessResponse = {
      repositories,
      source,
      cachedAt: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Trending API error:", error)
    
    const errorResponse: TrendingErrorResponse = {
      error: "Failed to fetch trending repositories",
      details: error instanceof Error ? error.message : "Unknown error",
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
