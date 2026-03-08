import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import ContributorFriendlyRepo from "@/models/ContributorFriendlyRepo"

export async function GET(req: NextRequest) {
    try {
        await connectDB()

        const { searchParams } = new URL(req.url)
        const language = searchParams.get("language")
        const minStars = parseInt(searchParams.get("minStars") || "0")
        const limit = parseInt(searchParams.get("limit") || "50")
        const page = parseInt(searchParams.get("page") || "1")

        // Build query
        const query: any = { syncStatus: "active" }

        if (language && language !== "All") {
            query.language = language
        }

        if (minStars > 0) {
            query.stargazersCount = { $gte: minStars }
        }

        // Fetch repos sorted by quality score
        const skip = (page - 1) * limit
        const repos = await ContributorFriendlyRepo.find(query)
            .sort({ qualityScore: -1, stargazersCount: -1 })
            .limit(limit)
            .skip(skip)
            .lean()

        const total = await ContributorFriendlyRepo.countDocuments(query)

        return NextResponse.json({
            success: true,
            repos,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        })
    } catch (error: any) {
        console.error("[Explore API] Error:", error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
