import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserService } from "@/lib/services/user-service"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken || !session?.user?.githubId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const githubId = session.user.githubId

    // Invalidate cache
    await UserService.invalidateUserCache(githubId)

    // Sync fresh data from GitHub
    const user = await UserService.syncUserFromGitHub(
      session.accessToken,
      githubId
    )

    await UserService.syncRepositories(
      session.accessToken,
      user._id.toString(),
      githubId
    )

    // Fetch updated data
    const userBasic = await UserService.getUserBasic(githubId)
    const repoList = await UserService.getRepoList(githubId)
    const userFull = await UserService.getUserFull(githubId)

    const languages = new Set<string>()
    repoList?.forEach((repo) => {
      if (repo.language) languages.add(repo.language)
    })

    return NextResponse.json({
      user: {
        ...userBasic,
        company: userFull?.company || "",
        blog: userFull?.blog || "",
        twitter_username: userFull?.twitter_username || "",
        hireable: userFull?.hireable || false,
        created_at: userFull?.created_at || new Date(),
      },
      repos: repoList || [],
      languages: Array.from(languages),
      stats: {
        totalRepos: repoList?.length || 0,
        totalStars: repoList?.reduce((sum, repo) => sum + repo.stargazers_count, 0) || 0,
        totalForks: repoList?.reduce((sum, repo) => sum + repo.forks_count, 0) || 0,
      },
      synced: true,
    })
  } catch (error) {
    console.error("Sync error:", error)
    return NextResponse.json(
      { error: "Failed to sync GitHub data" },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
