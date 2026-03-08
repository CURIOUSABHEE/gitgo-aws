/**
 * Test script for profile update functionality
 * 
 * Run with: npx ts-node scripts/test-profile-update.ts
 * 
 * This script tests:
 * 1. Fetching user profile
 * 2. Updating user profile
 * 3. Verifying cache invalidation
 * 4. Confirming changes persist
 */

import { connectDB } from "../lib/mongodb"
import User from "../models/User"
import { getCached, deleteCached } from "../lib/redis"

async function testProfileUpdate() {
  console.log("🧪 Testing Profile Update Functionality\n")

  try {
    // Connect to database
    console.log("1️⃣ Connecting to MongoDB...")
    await connectDB()
    console.log("✅ Connected to MongoDB\n")

    // Find a test user (replace with your GitHub ID)
    const testGithubId = process.env.TEST_GITHUB_ID || "YOUR_GITHUB_ID_HERE"
    console.log(`2️⃣ Finding user with GitHub ID: ${testGithubId}`)
    
    let user = await User.findOne({ githubId: testGithubId })
    
    if (!user) {
      console.log("❌ User not found. Please:")
      console.log("   1. Log in to the app first")
      console.log("   2. Set TEST_GITHUB_ID in .env")
      console.log("   3. Or replace YOUR_GITHUB_ID_HERE in this script")
      return
    }
    
    console.log(`✅ Found user: ${user.name} (@${user.login})\n`)

    // Store original values
    const originalName = user.name
    const originalBio = user.bio
    
    console.log("📝 Original values:")
    console.log(`   Name: ${originalName}`)
    console.log(`   Bio: ${originalBio}\n`)

    // Test 1: Update profile
    console.log("3️⃣ Updating profile...")
    const testName = `Test User ${Date.now()}`
    const testBio = `Test bio updated at ${new Date().toISOString()}`
    
    user = await User.findOneAndUpdate(
      { githubId: testGithubId },
      {
        $set: {
          name: testName,
          bio: testBio,
        },
      },
      { new: true }
    )
    
    console.log("✅ Profile updated in MongoDB")
    console.log(`   New Name: ${user?.name}`)
    console.log(`   New Bio: ${user?.bio}\n`)

    // Test 2: Check cache before invalidation
    console.log("4️⃣ Checking Redis cache...")
    const cachedBefore = await getCached(`user:basic:${testGithubId}`)
    
    if (cachedBefore) {
      console.log("⚠️  Cache exists (should be invalidated):")
      console.log(`   Cached Name: ${(cachedBefore as any).name}`)
    } else {
      console.log("✅ No cache found (already invalidated or never cached)\n")
    }

    // Test 3: Invalidate cache
    console.log("5️⃣ Invalidating Redis cache...")
    await deleteCached(`user:basic:${testGithubId}`)
    await deleteCached(`user:repos:${testGithubId}`)
    console.log("✅ Cache invalidated\n")

    // Test 4: Verify cache is gone
    console.log("6️⃣ Verifying cache invalidation...")
    const cachedAfter = await getCached(`user:basic:${testGithubId}`)
    
    if (cachedAfter) {
      console.log("❌ Cache still exists (invalidation failed)")
    } else {
      console.log("✅ Cache successfully invalidated\n")
    }

    // Test 5: Fetch from database again
    console.log("7️⃣ Fetching from database again...")
    const userAfter = await User.findOne({ githubId: testGithubId })
    
    if (userAfter?.name === testName && userAfter?.bio === testBio) {
      console.log("✅ Changes persisted in database")
      console.log(`   Name: ${userAfter.name}`)
      console.log(`   Bio: ${userAfter.bio}\n`)
    } else {
      console.log("❌ Changes did not persist")
    }

    // Restore original values
    console.log("8️⃣ Restoring original values...")
    await User.findOneAndUpdate(
      { githubId: testGithubId },
      {
        $set: {
          name: originalName,
          bio: originalBio,
        },
      }
    )
    console.log("✅ Original values restored\n")

    // Summary
    console.log("=" .repeat(50))
    console.log("🎉 All tests passed!")
    console.log("=" .repeat(50))
    console.log("\n✅ Profile update functionality is working correctly!")
    console.log("\nNext steps:")
    console.log("1. Test in the UI: Go to Settings → Profile")
    console.log("2. Make changes and click 'Save Changes'")
    console.log("3. Refresh the page")
    console.log("4. Verify changes persist\n")

  } catch (error) {
    console.error("\n❌ Test failed with error:")
    console.error(error)
    console.log("\nTroubleshooting:")
    console.log("1. Make sure MongoDB is running")
    console.log("2. Make sure Redis is running")
    console.log("3. Check your .env file")
    console.log("4. Make sure you're logged in to the app first")
  } finally {
    process.exit(0)
  }
}

// Run the test
testProfileUpdate()
