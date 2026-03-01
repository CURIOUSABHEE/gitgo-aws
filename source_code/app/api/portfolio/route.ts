import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Portfolio from "@/models/Portfolio"
import User from "@/models/User"

// GET - Get user's portfolio
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const userId = session.user.id || session.user.email

    const portfolio = await Portfolio.findOne({ userId })

    if (!portfolio) {
      return NextResponse.json({ portfolio: null })
    }

    return NextResponse.json({ portfolio })
  } catch (error) {
    console.error("Error fetching portfolio:", error)
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 }
    )
  }
}

// POST - Create or update portfolio
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { username, theme, sections, socialLinks, isPublished } = body

    await connectDB()

    const userId = session.user.id || session.user.email

    // Validate username (alphanumeric and hyphens only)
    if (username && !/^[a-z0-9-]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain lowercase letters, numbers, and hyphens" },
        { status: 400 }
      )
    }

    // Check if username is already taken (by another user)
    if (username) {
      const existing = await Portfolio.findOne({
        subdomain: username,
        userId: { $ne: userId },
      })

      if (existing) {
        return NextResponse.json(
          { error: "This username is already taken" },
          { status: 400 }
        )
      }
    }

    // Create or update portfolio
    const portfolio = await Portfolio.findOneAndUpdate(
      { userId },
      {
        userId,
        username: username || session.user.name?.toLowerCase().replace(/\s+/g, "-"),
        subdomain: username || session.user.name?.toLowerCase().replace(/\s+/g, "-"),
        theme: theme || "default",
        sections: sections || {
          about: true,
          skills: true,
          projects: true,
          experience: true,
          education: true,
          contributions: true,
        },
        socialLinks: socialLinks || {},
        isPublished: isPublished !== undefined ? isPublished : false,
        publishedAt: isPublished ? new Date() : undefined,
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({
      portfolio,
      url: `https://${portfolio.subdomain}.gitgo.dev`,
    })
  } catch (error) {
    console.error("Error creating/updating portfolio:", error)
    return NextResponse.json(
      { error: "Failed to save portfolio" },
      { status: 500 }
    )
  }
}

// DELETE - Unpublish portfolio
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const userId = session.user.id || session.user.email

    await Portfolio.findOneAndUpdate(
      { userId },
      { isPublished: false }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unpublishing portfolio:", error)
    return NextResponse.json(
      { error: "Failed to unpublish portfolio" },
      { status: 500 }
    )
  }
}
