import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserService } from "@/lib/services/user-service"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.githubId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const stats = await UserService.getTechnologyStats(session.user.githubId)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Technology map fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch technology map" },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
