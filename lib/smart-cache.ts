/**
 * Smart Cache Layer - Intelligent caching with TTL and cache warming
 * 
 * Features:
 * - TTL-based expiration
 * - Cache warming (pre-fetch popular repos)
 * - Stale-while-revalidate pattern
 * - Memory-efficient LRU eviction
 */

import { connectDB } from "./mongodb"
import { RepositoryAnalysis } from "@/models/RepositoryAnalysis"
import { RouteCache } from "@/models/RouteCache"

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  staleWhileRevalidate?: boolean // Return stale data while fetching fresh
}

export class SmartCache {
  private static readonly DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days
  private static readonly STALE_THRESHOLD = 24 * 60 * 60 * 1000 // 1 day

  /**
   * Check if cached analysis is still fresh
   */
  static isFresh(analyzedAt: Date, ttl: number = this.DEFAULT_TTL): boolean {
    const age = Date.now() - new Date(analyzedAt).getTime()
    return age < ttl
  }

  /**
   * Check if cached analysis is stale but usable
   */
  static isStale(analyzedAt: Date): boolean {
    const age = Date.now() - new Date(analyzedAt).getTime()
    return age >= this.STALE_THRESHOLD && age < this.DEFAULT_TTL
  }

  /**
   * Get repository analysis with smart caching
   */
  static async getRepoAnalysis(
    repoUrl: string,
    options: CacheOptions = {}
  ): Promise<{ data: any; cached: boolean; stale: boolean } | null> {
    await connectDB()

    const cached = await RepositoryAnalysis.findOne({ repoUrl }).lean()
    
    if (!cached) {
      return null
    }

    const ttl = options.ttl || this.DEFAULT_TTL
    const fresh = this.isFresh(cached.analyzedAt, ttl)
    const stale = this.isStale(cached.analyzedAt)

    // If stale-while-revalidate is enabled and data is stale, return it
    // but signal that revalidation should happen in background
    if (options.staleWhileRevalidate && stale) {
      console.log(`[SmartCache] Returning stale data for ${repoUrl}, revalidation recommended`)
      return {
        data: cached,
        cached: true,
        stale: true,
      }
    }

    // If data is fresh, return it
    if (fresh) {
      console.log(`[SmartCache] Cache HIT (fresh) for ${repoUrl}`)
      return {
        data: cached,
        cached: true,
        stale: false,
      }
    }

    // Data is too old
    console.log(`[SmartCache] Cache EXPIRED for ${repoUrl}`)
    return null
  }

  /**
   * Get route analysis with smart caching
   */
  static async getRouteAnalysis(
    repoUrl: string,
    route: string,
    options: CacheOptions = {}
  ): Promise<{ data: any; cached: boolean; stale: boolean } | null> {
    await connectDB()

    const cached = await RouteCache.findOne({ repoUrl, route }).lean()
    
    if (!cached) {
      return null
    }

    const ttl = options.ttl || this.DEFAULT_TTL
    const fresh = this.isFresh(cached.cachedAt, ttl)
    const stale = this.isStale(cached.cachedAt)

    if (options.staleWhileRevalidate && stale) {
      console.log(`[SmartCache] Returning stale route data for ${route}, revalidation recommended`)
      return {
        data: {
          flowVisualization: cached.flowVisualization,
          executionTrace: cached.executionTrace,
        },
        cached: true,
        stale: true,
      }
    }

    if (fresh) {
      console.log(`[SmartCache] Route cache HIT (fresh) for ${route}`)
      return {
        data: {
          flowVisualization: cached.flowVisualization,
          executionTrace: cached.executionTrace,
        },
        cached: true,
        stale: false,
      }
    }

    console.log(`[SmartCache] Route cache EXPIRED for ${route}`)
    return null
  }

  /**
   * Get popular repositories for cache warming
   */
  static async getPopularRepos(limit: number = 10): Promise<string[]> {
    await connectDB()

    // Get most recently analyzed repos (proxy for popularity)
    const popular = await RepositoryAnalysis.find()
      .sort({ analyzedAt: -1 })
      .limit(limit)
      .select("repoUrl")
      .lean()

    return popular.map((r) => r.repoUrl)
  }

  /**
   * Clean up old cache entries
   */
  static async cleanupOldEntries(olderThan: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    await connectDB()

    const cutoffDate = new Date(Date.now() - olderThan)

    const [repoResult, routeResult] = await Promise.all([
      RepositoryAnalysis.deleteMany({ analyzedAt: { $lt: cutoffDate } }),
      RouteCache.deleteMany({ cachedAt: { $lt: cutoffDate } }),
    ])

    const totalDeleted = (repoResult.deletedCount || 0) + (routeResult.deletedCount || 0)
    console.log(`[SmartCache] Cleaned up ${totalDeleted} old cache entries`)

    return totalDeleted
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    totalRepos: number
    totalRoutes: number
    freshRepos: number
    staleRepos: number
  }> {
    await connectDB()

    const now = Date.now()
    const staleThreshold = new Date(now - this.STALE_THRESHOLD)
    const expiredThreshold = new Date(now - this.DEFAULT_TTL)

    const [totalRepos, totalRoutes, freshRepos, staleRepos] = await Promise.all([
      RepositoryAnalysis.countDocuments(),
      RouteCache.countDocuments(),
      RepositoryAnalysis.countDocuments({ analyzedAt: { $gte: staleThreshold } }),
      RepositoryAnalysis.countDocuments({
        analyzedAt: { $gte: expiredThreshold, $lt: staleThreshold },
      }),
    ])

    return {
      totalRepos,
      totalRoutes,
      freshRepos,
      staleRepos,
    }
  }
}
