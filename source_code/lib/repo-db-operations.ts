/**
 * Database Operations for Contributor-Friendly Repositories
 * Handles CRUD operations and batch updates
 */

import ContributorFriendlyRepo from "@/models/ContributorFriendlyRepo"
import { calculateQualityScore, meetsQualityThreshold } from "./repo-scorer"
import { connectDB } from "./mongodb"

interface RepoData {
  githubId: number
  name: string
  fullName: string
  description: string
  htmlUrl: string
  language: string | null
  topics: string[]
  stargazersCount: number
  openIssuesCount: number
  forksCount: number
  lastPushedAt: Date
  hasContributingFile: boolean
  hasCI: boolean
  licenseName: string | null
  goodFirstIssueCount: number
  helpWantedCount: number
  source?: string
}

interface UpsertResult {
  inserted: number
  updated: number
  skipped: number
  errors: number
}

/**
 * Upsert repositories into database
 * Only stores repos with quality score >= 40
 */
export async function upsertRepos(repos: RepoData[]): Promise<UpsertResult> {
  await connectDB()

  const result: UpsertResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  }

  console.log(`[DB] Processing ${repos.length} repositories`)

  for (const repo of repos) {
    try {
      // Calculate quality score
      const qualityScore = calculateQualityScore({
        stargazersCount: repo.stargazersCount,
        lastPushedAt: repo.lastPushedAt,
        goodFirstIssueCount: repo.goodFirstIssueCount,
        hasContributingFile: repo.hasContributingFile,
        hasCI: repo.hasCI,
        openIssuesCount: repo.openIssuesCount,
      })

      // Skip repos below quality threshold
      if (!meetsQualityThreshold(qualityScore)) {
        result.skipped++
        continue
      }

      // Upsert repository
      const existingRepo = await ContributorFriendlyRepo.findOne({ githubId: repo.githubId })

      if (existingRepo) {
        // Update existing repo
        await ContributorFriendlyRepo.updateOne(
          { githubId: repo.githubId },
          {
            $set: {
              name: repo.name,
              fullName: repo.fullName,
              description: repo.description,
              htmlUrl: repo.htmlUrl,
              language: repo.language,
              topics: repo.topics,
              stargazersCount: repo.stargazersCount,
              openIssuesCount: repo.openIssuesCount,
              forksCount: repo.forksCount,
              lastPushedAt: repo.lastPushedAt,
              hasContributingFile: repo.hasContributingFile,
              hasCI: repo.hasCI,
              licenseName: repo.licenseName,
              goodFirstIssueCount: repo.goodFirstIssueCount,
              helpWantedCount: repo.helpWantedCount,
              qualityScore,
              lastSyncedAt: new Date(),
              syncStatus: "active",
              source: repo.source || "github",
            },
          }
        )
        result.updated++
      } else {
        // Insert new repo
        await ContributorFriendlyRepo.create({
          githubId: repo.githubId,
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description,
          htmlUrl: repo.htmlUrl,
          language: repo.language,
          topics: repo.topics,
          stargazersCount: repo.stargazersCount,
          openIssuesCount: repo.openIssuesCount,
          forksCount: repo.forksCount,
          lastPushedAt: repo.lastPushedAt,
          hasContributingFile: repo.hasContributingFile,
          hasCI: repo.hasCI,
          licenseName: repo.licenseName,
          goodFirstIssueCount: repo.goodFirstIssueCount,
          helpWantedCount: repo.helpWantedCount,
          qualityScore,
          lastSyncedAt: new Date(),
          syncStatus: "active",
          source: repo.source || "github",
        })
        result.inserted++
      }

      // Log progress every 100 repos
      if ((result.inserted + result.updated + result.skipped) % 100 === 0) {
        console.log(`[DB] Progress: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped`)
      }
    } catch (error) {
      console.error(`[DB] Error processing repo ${repo.fullName}:`, error)
      result.errors++
    }
  }

  console.log(`[DB] Complete: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`)
  return result
}

/**
 * Mark stale repositories as archived
 * Repos not synced in the last 30 days
 */
export async function markStaleRepos(): Promise<number> {
  await connectDB()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const result = await ContributorFriendlyRepo.updateMany(
    {
      lastSyncedAt: { $lt: thirtyDaysAgo },
      syncStatus: "active",
    },
    {
      $set: { syncStatus: "archived" },
    }
  )

  console.log(`[DB] Marked ${result.modifiedCount} repos as archived`)
  return result.modifiedCount
}

/**
 * Get repository statistics
 */
export async function getRepoStats(): Promise<{
  total: number
  active: number
  archived: number
  byLanguage: Record<string, number>
  avgQualityScore: number
}> {
  try {
    await connectDB()

    const [total, active, archived, byLanguage, avgScore] = await Promise.all([
      ContributorFriendlyRepo.countDocuments().catch(() => 0),
      ContributorFriendlyRepo.countDocuments({ syncStatus: "active" }).catch(() => 0),
      ContributorFriendlyRepo.countDocuments({ syncStatus: "archived" }).catch(() => 0),
      ContributorFriendlyRepo.aggregate([
        { $match: { syncStatus: "active", language: { $ne: null } } },
        { $group: { _id: "$language", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]).catch(() => []),
      ContributorFriendlyRepo.aggregate([
        { $match: { syncStatus: "active" } },
        { $group: { _id: null, avg: { $avg: "$qualityScore" } } },
      ]).catch(() => []),
    ])

    const languageMap: Record<string, number> = {}
    if (Array.isArray(byLanguage)) {
      byLanguage.forEach((item: any) => {
        languageMap[item._id] = item.count
      })
    }

    return {
      total,
      active,
      archived,
      byLanguage: languageMap,
      avgQualityScore: avgScore[0]?.avg || 0,
    }
  } catch (error) {
    console.error("[DB] Error getting stats:", error)
    // Return fallback stats if database is unavailable
    return {
      total: 0,
      active: 0,
      archived: 0,
      byLanguage: {},
      avgQualityScore: 0,
    }
  }
}

/**
 * Query repositories with filters
 */
export async function queryRepos(filters: {
  language?: string
  minStars?: number
  minQualityScore?: number
  hasGoodFirstIssues?: boolean
  limit?: number
  skip?: number
}): Promise<any[]> {
  await connectDB()

  const query: any = { syncStatus: "active" }

  if (filters.language) {
    query.language = filters.language
  }

  if (filters.minStars) {
    query.stargazersCount = { $gte: filters.minStars }
  }

  if (filters.minQualityScore) {
    query.qualityScore = { $gte: filters.minQualityScore }
  }

  if (filters.hasGoodFirstIssues) {
    query.goodFirstIssueCount = { $gt: 0 }
  }

  return ContributorFriendlyRepo.find(query)
    .sort({ qualityScore: -1, stargazersCount: -1 })
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .lean()
}

/**
 * Delete repositories by criteria
 */
export async function deleteRepos(criteria: {
  olderThan?: Date
  qualityScoreBelow?: number
}): Promise<number> {
  await connectDB()

  const query: any = {}

  if (criteria.olderThan) {
    query.lastSyncedAt = { $lt: criteria.olderThan }
  }

  if (criteria.qualityScoreBelow) {
    query.qualityScore = { $lt: criteria.qualityScoreBelow }
  }

  const result = await ContributorFriendlyRepo.deleteMany(query)
  console.log(`[DB] Deleted ${result.deletedCount} repos`)
  return result.deletedCount
}
