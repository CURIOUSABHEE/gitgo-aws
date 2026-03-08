import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserService } from "@/lib/services/user-service"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const repoId = parseInt(id)
    if (isNaN(repoId)) {
      return NextResponse.json(
        { error: "Invalid repository ID" },
        { status: 400 }
      )
    }

    const repo = await UserService.getRepoDetail(repoId)

    if (!repo) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(repo)
  } catch (error) {
    console.error("Repository fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch repository details" },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
