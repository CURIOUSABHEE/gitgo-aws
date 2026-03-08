import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"

// Validate LinkedIn URL format
function isValidLinkedInUrl(url: string): boolean {
    try {
        const parsed = new URL(url)
        return (
            (parsed.hostname === "linkedin.com" ||
                parsed.hostname === "www.linkedin.com" ||
                parsed.hostname.endsWith(".linkedin.com")) &&
            parsed.pathname.startsWith("/in/")
        )
    } catch {
        return false
    }
}

// POST /api/user/linkedin - Save LinkedIn profile URL and extract basic info
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.githubId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const body = await request.json()
        const { url } = body

        if (!url || typeof url !== "string") {
            return NextResponse.json({ error: "LinkedIn URL is required" }, { status: 400 })
        }

        // Normalize URL
        let normalizedUrl = url.trim()
        if (!normalizedUrl.startsWith("http")) {
            normalizedUrl = "https://" + normalizedUrl
        }

        if (!isValidLinkedInUrl(normalizedUrl)) {
            return NextResponse.json(
                { error: "Invalid LinkedIn URL. Must be a linkedin.com/in/ profile URL." },
                { status: 400 }
            )
        }

        // Extract username from URL
        const urlObj = new URL(normalizedUrl)
        const linkedinUsername = urlObj.pathname.split("/in/")[1]?.replace(/\//g, "") || ""

        // Store LinkedIn data
        const updatedUser = await User.findOneAndUpdate(
            { githubId: String(session.user.githubId) },
            {
                $set: {
                    "linkedin.url": normalizedUrl,
                    "linkedin.fetchedAt": new Date(),
                },
            },
            { new: true }
        )

        if (!updatedUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            data: {
                url: updatedUser.linkedin?.url,
                username: linkedinUsername,
                fetchedAt: updatedUser.linkedin?.fetchedAt,
            },
        })
    } catch (error) {
        console.error("LinkedIn save error:", error)
        return NextResponse.json({ error: "Failed to save LinkedIn data" }, { status: 500 })
    }
}

// GET /api/user/linkedin - Get saved LinkedIn data
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.githubId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const user = await User.findOne(
            { githubId: String(session.user.githubId) },
            { linkedin: 1 }
        )

        return NextResponse.json({
            data: user?.linkedin || null,
        })
    } catch (error) {
        console.error("LinkedIn fetch error:", error)
        return NextResponse.json({ error: "Failed to fetch LinkedIn data" }, { status: 500 })
    }
}

// DELETE /api/user/linkedin - Remove LinkedIn data
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.githubId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        await User.findOneAndUpdate(
            { githubId: String(session.user.githubId) },
            { $unset: { linkedin: "" } }
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("LinkedIn delete error:", error)
        return NextResponse.json({ error: "Failed to delete LinkedIn data" }, { status: 500 })
    }
}

export const dynamic = "force-dynamic"
