/**
 * Test script to verify MongoDB connection and schema
 * Run with: npx tsx scripts/test-db.ts
 */

import { connectDB } from "../lib/mongodb"
import User from "../models/User"
import Repository from "../models/Repository"

async function testDatabase() {
  try {
    console.log("🔌 Connecting to MongoDB...")
    await connectDB()
    console.log("✅ MongoDB connected successfully!")

    // Test User model
    console.log("\n📊 Testing User model...")
    const userCount = await User.countDocuments()
    console.log(`   Found ${userCount} users in database`)

    if (userCount > 0) {
      const sampleUser = await User.findOne().lean()
      console.log("   Sample user:", {
        login: sampleUser?.login,
        name: sampleUser?.name,
        email: sampleUser?.email,
        repos: sampleUser?.public_repos,
      })
    }

    // Test Repository model
    console.log("\n📦 Testing Repository model...")
    const repoCount = await Repository.countDocuments()
    console.log(`   Found ${repoCount} repositories in database`)

    if (repoCount > 0) {
      const sampleRepo = await Repository.findOne().lean()
      console.log("   Sample repository:", {
        name: sampleRepo?.name,
        language: sampleRepo?.language,
        stars: sampleRepo?.stargazers_count,
      })
    }

    // Test indexes
    console.log("\n🔍 Checking indexes...")
    const userIndexes = await User.collection.getIndexes()
    console.log("   User indexes:", Object.keys(userIndexes))

    const repoIndexes = await Repository.collection.getIndexes()
    console.log("   Repository indexes:", Object.keys(repoIndexes))

    console.log("\n✨ All tests passed!")
    process.exit(0)
  } catch (error) {
    console.error("\n❌ Error:", error)
    process.exit(1)
  }
}

testDatabase()
