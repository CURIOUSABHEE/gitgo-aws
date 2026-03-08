import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Portfolio from "@/models/Portfolio"
import { generatePortfolioContent } from "@/lib/portfolio-schema"

// POST generate portfolio from GitHub data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { templateId, githubData, techMap } = body

    if (!templateId || !githubData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Generate sections from GitHub data
    const sections = await generatePortfolioContent(githubData, techMap, templateId)

    await connectDB()

    // Create or update portfolio
    const portfolio = await Portfolio.findOneAndUpdate(
      { userId: session.user.githubId },
      {
        $set: {
          templateId,
          theme: "midnight", // default theme
          sections,
          metadata: {
            title: `${githubData.user.name || githubData.user.login}'s Portfolio`,
            description: githubData.user.bio || "Developer Portfolio",
          },
        },
      },
      { new: true, upsert: true, runValidators: true }
    ).lean()

    return NextResponse.json({ 
      success: true, 
      portfolio,
      message: "Portfolio generated successfully" 
    })
  } catch (error) {
    console.error("Error generating portfolio:", error)
    return NextResponse.json(
      { error: "Failed to generate portfolio" },
      { status: 500 }
    )
  }
}
