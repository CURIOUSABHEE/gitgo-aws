import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getFilteredIssues } from "@/lib/github"

/**
 * GET /api/repo-issues?repo=owner/name
 * Returns up to 5 "good first issue" issues for the given repository.
 * Used by the Smart Matches RepoCard quick-view panel.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.githubId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const repo = searchParams.get("repo") // e.g. "vercel/next.js"

        if (!repo || !repo.includes("/")) {
            return NextResponse.json({ error: "Invalid repo param. Expected owner/name." }, { status: 400 })
        }

        const [owner, name] = repo.split("/")
        const token = (session as any).accessToken || process.env.GITHUB_TOKEN || ""

        const issues = await getFilteredIssues(
            owner,
            name,
            { labels: ["good first issue"], type: "issue", sort: "created-desc" },
            token
        )

        // Return only the top 5 with minimal fields
        const slim = issues.slice(0, 5).map(i => ({
            number: i.number,
            title: i.title,
            html_url: i.html_url,
            comments: i.comments,
            created_at: i.created_at,
        }))

        return NextResponse.json({ issues: slim })
    } catch (error: any) {
        console.error("[repo-issues] Error:", error)
        return NextResponse.json({ error: error.message || "Failed to fetch issues" }, { status: 500 })
    }
}
