import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Post from "@/models/Post"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.githubId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await connectDB()

    const { id } = await params
    const post = await Post.findById(id)
    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      )
    }

    const githubId = session.user.githubId
    const hasLiked = post.likes.includes(githubId)

    if (hasLiked) {
      // Unlike
      post.likes = post.likes.filter((id) => id !== githubId)
    } else {
      // Like
      post.likes.push(githubId)
    }

    await post.save()

    return NextResponse.json({ 
      liked: !hasLiked,
      likesCount: post.likes.length 
    })
  } catch (error) {
    console.error("Like error:", error)
    return NextResponse.json(
      { error: "Failed to like post" },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
