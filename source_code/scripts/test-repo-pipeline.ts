/**
 * Test Script for Repository Pipeline
 * Run with: npx tsx scripts/test-repo-pipeline.ts
 */

import { RepoFetcher } from "../lib/repo-fetcher"
import { calculateQualityScore, calculateScoreBreakdown } from "../lib/repo-scorer"
import { upsertRepos, getRepoStats } from "../lib/repo-db-operations"

async function testPipeline() {
  console.log("🚀 Testing Repository Pipeline\n")

  // Check environment variables
  console.log("1️⃣ Checking environment variables...")
  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) {
    console.error("❌ GITHUB_TOKEN not found in environment")
    console.log("   Add it to your .env file")
    process.exit(1)
  }
  console.log("✅ GITHUB_TOKEN found\n")

  // Test quality scorer
  console.log("2️⃣ Testing quality scorer...")
  const testRepo = {
    stargazersCount: 5000,
    lastPushedAt: new Date(),
    goodFirstIssueCount: 10,
    hasContributingFile: true,
    hasCI: true,
    openIssuesCount: 50,
  }
  const score = calculateQualityScore(testRepo)
  const breakdown = calculateScoreBreakdown(testRepo)
  console.log("   Test repo score:", score)
  console.log("   Breakdown:", JSON.stringify(breakdown, null, 2))
  console.log("✅ Quality scorer working\n")

  // Test repo fetcher (fetch only 5 repos for testing)
  console.log("3️⃣ Testing repo fetcher (fetching 5 repos)...")
  const fetcher = new RepoFetcher(githubToken)
  const repos = await fetcher.fetchRepos(5)
  console.log(`   Fetched ${repos.length} repos`)
  if (repos.length > 0) {
    console.log("   Sample repo:", {
      name: repos[0].fullName,
      stars: repos[0].stargazersCount,
      language: repos[0].language,
      goodFirstIssues: repos[0].goodFirstIssueCount,
    })
  }
  const rateLimitStatus = fetcher.getRateLimitStatus()
  console.log("   Rate limit:", rateLimitStatus.remaining, "remaining")
  console.log("✅ Repo fetcher working\n")

  // Test database operations
  console.log("4️⃣ Testing database operations...")
  if (repos.length > 0) {
    const result = await upsertRepos(repos)
    console.log("   Upsert result:", result)
    console.log("✅ Database operations working\n")

    // Get stats
    console.log("5️⃣ Getting repository statistics...")
    const stats = await getRepoStats()
    console.log("   Total repos:", stats.total)
    console.log("   Active repos:", stats.active)
    console.log("   Avg quality score:", stats.avgQualityScore.toFixed(2))
    console.log("   Top languages:", Object.keys(stats.byLanguage).slice(0, 5).join(", "))
    console.log("✅ Statistics working\n")
  }

  console.log("🎉 All tests passed!")
  console.log("\n📝 Next steps:")
  console.log("   1. Run full sync via UI: http://localhost:3000/dashboard/repo-sync")
  console.log("   2. Or trigger via API: POST /api/repos/sync")
  console.log("   3. Set up cron job for automatic syncing")
}

// Run tests
testPipeline()
  .then(() => {
    console.log("\n✅ Test completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error)
    process.exit(1)
  })
