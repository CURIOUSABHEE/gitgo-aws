import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const user = await User.findOne({ githubId: session.user.githubId })
      .select("subscriptionPlan subscriptionStatus subscriptionEndDate routeAnalysisCount routeAnalysisResetDate")
      .lean()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if we need to reset daily count
    const now = new Date()
    const resetDate = user.routeAnalysisResetDate || now
    const hoursSinceReset = (now.getTime() - new Date(resetDate).getTime()) / (1000 * 60 * 60)

    if (hoursSinceReset >= 24) {
      // Reset the count
      await User.findOneAndUpdate(
        { githubId: session.user.githubId },
        {
          routeAnalysisCount: 0,
          routeAnalysisResetDate: now,
        }
      )
      user.routeAnalysisCount = 0
      user.routeAnalysisResetDate = now
    }

    // Calculate limits based on plan
    const limits = {
      free: 2,
      starter: 10,
      pro: Infinity,
      enterprise: Infinity,
    }

    const plan = user.subscriptionPlan || "free"
    const limit = limits[plan as keyof typeof limits]
    const remaining = limit === Infinity ? Infinity : Math.max(0, limit - (user.routeAnalysisCount || 0))

    return NextResponse.json({
      plan,
      status: user.subscriptionStatus || "active",
      endDate: user.subscriptionEndDate,
      routeAnalysisCount: user.routeAnalysisCount || 0,
      routeAnalysisLimit: limit,
      routeAnalysisRemaining: remaining,
      canAnalyze: remaining > 0,
    })
  } catch (error) {
    console.error("Error fetching subscription status:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    )
  }
}
