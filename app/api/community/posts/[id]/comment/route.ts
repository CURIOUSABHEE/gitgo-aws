import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Post from "@/models/Post"
import User from "@/models/User"

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

    const body = await request.json()
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      )
    }

    await connectDB()

    const user = await User.findOne({ githubId: session.user.githubId }).lean()
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const { id } = await params
    const post = await Post.findById(id)
    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      )
    }

    post.comments.push({
      userId: user.githubId,
      author: {
        login: user.login,
        name: user.name || user.login,
        avatar_url: user.avatar_url,
      },
      content,
      createdAt: new Date(),
    })

    await post.save()

    return NextResponse.json({
      comment: post.comments[post.comments.length - 1],
      commentsCount: post.comments.length
    })
  } catch (error) {
    console.error("Comment error:", error)
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get("commentId")

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID is required" },
        { status: 400 }
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

    const commentIndex = post.comments.findIndex(
      (c: any) => c._id.toString() === commentId
    )

    if (commentIndex === -1) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      )
    }

    // Check if user owns the comment or is the post author
    const comment = post.comments[commentIndex]
    if (comment.userId !== session.user.githubId && post.author.githubId !== session.user.githubId) {
      return NextResponse.json(
        { error: "You can only delete your own comments" },
        { status: 403 }
      )
    }

    post.comments.splice(commentIndex, 1)
    await post.save()

    return NextResponse.json({
      success: true,
      commentsCount: post.comments.length
    })
  } catch (error) {
    console.error("Delete comment error:", error)
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
