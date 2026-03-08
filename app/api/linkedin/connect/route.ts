/**
 * LinkedIn Connect API
 * 
 * POST /api/linkedin/connect
 * Stores LinkedIn OAuth tokens after successful authentication
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.githubId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { linkedinId, accessToken, refreshToken, expiresIn } = body

    if (!linkedinId || !accessToken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    await connectDB()

    // Update user with LinkedIn credentials
    const user = await User.findOneAndUpdate(
      { githubId: session.user.githubId },
      {
        $set: {
          linkedinId,
          linkedinAccessToken: accessToken,
          linkedinRefreshToken: refreshToken,
          linkedinTokenExpiry: new Date(Date.now() + (expiresIn || 5184000) * 1000), // Default 60 days
        },
      },
      { new: true }
    )

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "LinkedIn connected successfully",
    })
  } catch (error) {
    console.error("LinkedIn connect error:", error)
    return NextResponse.json(
      { error: "Failed to connect LinkedIn" },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
