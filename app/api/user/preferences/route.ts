import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import UserPreferences from "@/models/UserPreferences"

// GET user preferences
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    let preferences = await UserPreferences.findOne({ 
      userId: session.user.githubId 
    }).lean()

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await UserPreferences.create({
        userId: session.user.githubId,
        emailNotifications: {
          newMatches: true,
          weeklyDigest: true,
          socialActivity: false,
          prUpdates: true,
        },
        pushNotifications: {
          highPriorityMatches: true,
          mentions: true,
          milestones: true,
        },
      })
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error("Error fetching preferences:", error)
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    )
  }
}

// PATCH update user preferences
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { emailNotifications, pushNotifications } = body

    await connectDB()
    
    const updateData: any = {}
    if (emailNotifications) updateData.emailNotifications = emailNotifications
    if (pushNotifications) updateData.pushNotifications = pushNotifications

    const preferences = await UserPreferences.findOneAndUpdate(
      { userId: session.user.githubId },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    ).lean()

    return NextResponse.json({ 
      success: true, 
      preferences,
      message: "Preferences updated successfully" 
    })
  } catch (error) {
    console.error("Error updating preferences:", error)
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    )
  }
}
