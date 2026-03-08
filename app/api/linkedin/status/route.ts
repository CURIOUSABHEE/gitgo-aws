/**
 * LinkedIn Status API
 * 
 * GET /api/linkedin/status
 * Check if LinkedIn is connected and get last sync time
 */

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.githubId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await connectDB()

    const user = await User.findOne({ githubId: session.user.githubId })
      .select("linkedinId linkedinLastSynced")
      .lean()

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      connected: !!user.linkedinId,
      lastSynced: user.linkedinLastSynced || null,
    })
  } catch (error) {
    console.error("LinkedIn status error:", error)
    return NextResponse.json(
      { error: "Failed to get LinkedIn status" },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
