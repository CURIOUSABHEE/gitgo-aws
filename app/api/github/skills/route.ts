import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserService } from "@/lib/services/user-service"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken || !session?.user?.githubId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const githubId = session.user.githubId

    const languages = await UserService.getUserLanguages(githubId)
    const skills = await UserService.getUserSkills(githubId)

    return NextResponse.json({
      languages,
      skills,
    })
  } catch (error) {
    console.error("Skills fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch skills" },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
