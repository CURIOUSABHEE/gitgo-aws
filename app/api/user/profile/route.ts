import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import { deleteCached } from "@/lib/redis"

// GET user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const user = await User.findOne({ githubId: session.user.githubId }).lean()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

// PATCH update user profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, bio, title, location, blog } = body

    await connectDB()
    
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (bio !== undefined) updateData.bio = bio
    if (title !== undefined) updateData.title = title
    if (location !== undefined) updateData.location = location
    if (blog !== undefined) updateData.blog = blog

    const user = await User.findOneAndUpdate(
      { githubId: session.user.githubId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Invalidate Redis cache so fresh data is fetched
    try {
      await deleteCached(`user:basic:${session.user.githubId}`)
      await deleteCached(`user:repos:${session.user.githubId}`)
      console.log(`[Profile Update] Cache invalidated for user ${session.user.githubId}`)
    } catch (cacheError) {
      console.error("Error invalidating cache:", cacheError)
      // Don't fail the request if cache invalidation fails
    }

    return NextResponse.json({ 
      success: true, 
      user,
      message: "Profile updated successfully" 
    })
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}
