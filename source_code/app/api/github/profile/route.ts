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

    // Try to get from cache/DB first
    let userBasic = await UserService.getUserBasic(githubId)
    let repoList = await UserService.getRepoList(githubId)

    // If not in cache/DB or data is stale, sync from GitHub
    if (!userBasic || !repoList) {
      // Sync user data from GitHub to MongoDB
      const user = await UserService.syncUserFromGitHub(
        session.accessToken,
        githubId
      )

      // Sync repositories from GitHub to MongoDB
      await UserService.syncRepositories(
        session.accessToken,
        user._id.toString(),
        githubId
      )

      // Fetch from cache (now populated)
      userBasic = await UserService.getUserBasic(githubId)
      repoList = await UserService.getRepoList(githubId)
    }

    // Get full user data for additional fields
    const userFull = await UserService.getUserFull(githubId)

    // Extract unique languages from repo list
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
    })
  } catch (error) {
    console.error("GitHub API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch GitHub data" },
      { status: 500 }
    )
  }
}

// Force dynamic rendering
export const dynamic = "force-dynamic"
