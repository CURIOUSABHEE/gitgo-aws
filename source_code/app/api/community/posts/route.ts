import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Post from "@/models/Post"
import User from "@/models/User"

// GET - Fetch all posts
export async function GET() {
  try {
    await connectDB()

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({ posts })
  } catch (error) {
    console.error("Posts fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    )
  }
}

// POST - Create a new post
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.githubId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { content, type = "post", milestone, tags = [] } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      )
    }

    await connectDB()

    // Get user info
    const user = await User.findOne({ githubId: session.user.githubId }).lean()
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Create post
    const post = await Post.create({
      userId: user._id,
      author: {
        githubId: user.githubId,
        login: user.login,
        name: user.name || user.login,
        avatar_url: user.avatar_url,
      },
      content,
      type,
      milestone,
      tags,
      likes: [],
      comments: [],
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error("Post creation error:", error)
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
