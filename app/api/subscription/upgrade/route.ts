import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"

/**
 * Upgrade user subscription
 * This is a placeholder - integrate with Razorpay for actual payment processing
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { plan, paymentId, subscriptionId } = body

    if (!plan || !["starter", "pro", "enterprise"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    await connectDB()
    
    // Calculate subscription end date (30 days from now)
    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + 30)

    const user = await User.findOneAndUpdate(
      { githubId: session.user.githubId },
      {
        subscriptionPlan: plan,
        subscriptionStatus: "active",
        subscriptionStartDate: now,
        subscriptionEndDate: endDate,
        subscriptionId: subscriptionId || `sub_${Date.now()}`,
        paymentId: paymentId || `pay_${Date.now()}`,
        routeAnalysisCount: 0,
        routeAnalysisResetDate: now,
      },
      { new: true }
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${plan} plan`,
      subscription: {
        plan: user.subscriptionPlan,
        status: user.subscriptionStatus,
        startDate: user.subscriptionStartDate,
        endDate: user.subscriptionEndDate,
      },
    })
  } catch (error) {
    console.error("Error upgrading subscription:", error)
    return NextResponse.json(
      { error: "Failed to upgrade subscription" },
      { status: 500 }
    )
  }
}
