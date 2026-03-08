import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"

/**
 * Check if user can perform route analysis and increment count
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const user = await User.findOne({ githubId: session.user.githubId })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if we need to reset daily count
    const now = new Date()
    const resetDate = user.routeAnalysisResetDate || now
    const hoursSinceReset = (now.getTime() - new Date(resetDate).getTime()) / (1000 * 60 * 60)

    if (hoursSinceReset >= 24) {
      // Reset the count
      user.routeAnalysisCount = 0
      user.routeAnalysisResetDate = now
      await user.save()
    }

    // Calculate limits based on plan
    const limits = {
      free: 50, // Raised from 2 to 50 to accommodate extra load-balanced GROQ API keys
      starter: 100,
      pro: Infinity,
      enterprise: Infinity,
    }

    const plan = user.subscriptionPlan || "free"
    const limit = limits[plan as keyof typeof limits]
    const currentCount = user.routeAnalysisCount || 0

    // Check if user has reached limit
    if (limit !== Infinity && currentCount >= limit) {
      return NextResponse.json(
        {
          allowed: false,
          reason: "limit_exceeded",
          plan,
          count: currentCount,
          limit,
        },
        { status: 402 } // Payment Required
      )
    }

    // Increment count
    user.routeAnalysisCount = currentCount + 1
    await user.save()

    return NextResponse.json({
      allowed: true,
      plan,
      count: user.routeAnalysisCount,
      limit,
      remaining: limit === Infinity ? Infinity : limit - user.routeAnalysisCount,
    })
  } catch (error) {
    console.error("Error checking route analysis limit:", error)
    return NextResponse.json(
      { error: "Failed to check limit" },
      { status: 500 }
    )
  }
}
