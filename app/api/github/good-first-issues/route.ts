import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const owner = searchParams.get("owner")
    const repo = searchParams.get("repo")

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "owner and repo are required" },
        { status: 400 }
      )
    }

    const token = (session as any).accessToken || process.env.GITHUB_TOKEN

    if (!token) {
      return NextResponse.json(
        { error: "GitHub token not found" },
        { status: 401 }
      )
    }

    // Fetch issues with "good first issue" label (try multiple variations)
    const labelVariations = [
      'good first issue',
      'good-first-issue',
      'Good First Issue',
      'beginner friendly',
      'beginner-friendly',
      'help wanted'
    ]
    
    let totalCount = 0
    
    for (const label of labelVariations) {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/issues?state=open&labels=${encodeURIComponent(label)}&per_page=1`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        )

        if (response.ok) {
          const linkHeader = response.headers.get("Link")
          let count = 0

          if (linkHeader) {
            const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/)
            if (lastMatch) {
              count = parseInt(lastMatch[1], 10)
            } else {
              const data = await response.json()
              count = data.length
            }
          } else {
            const data = await response.json()
            count = data.length
          }
          
          totalCount += count
        }
      } catch (err) {
        // Continue to next label
        continue
      }
    }

    return NextResponse.json({ count: totalCount })
  } catch (error) {
    console.error("Error fetching good first issues:", error)
    return NextResponse.json({ count: 0 })
  }
}
