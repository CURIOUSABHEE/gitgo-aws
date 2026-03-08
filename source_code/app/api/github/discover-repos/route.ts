import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import DiscoveredRepos from "@/models/DiscoveredRepos"

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = (session as any).accessToken || process.env.GITHUB_TOKEN

    if (!token) {
      return NextResponse.json(
        { error: "GitHub token not found" },
        { status: 401 }
      )
    }

    await connectDB()

    // Get user ID
    const userId = session.user.id || session.user.email || "anonymous"

    // Check if we have cached data
    const cachedData = await DiscoveredRepos.findOne({ userId })

    if (cachedData) {
      const cacheAge = Date.now() - new Date(cachedData.lastFetchedAt).getTime()
      
      // If cache is fresh (less than 24 hours old), return it
      if (cacheAge < CACHE_DURATION_MS) {
        console.log(`[Discover] ✅ Cache hit for user ${userId} (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`)
        return NextResponse.json({
          repos: cachedData.repos,
          languages: cachedData.languages,
          cached: true,
          cachedAt: cachedData.lastFetchedAt,
        })
      }
      
      console.log(`[Discover] ⚠️ Cache expired for user ${userId}, refreshing...`)
    } else {
      console.log(`[Discover] ❌ Cache miss for user ${userId}, fetching from GitHub...`)
    }

    // Fetch fresh data from GitHub
    const user = await User.findOne({
      $or: [
        { githubId: session.user.id },
        { email: session.user.email }
      ]
    })

    let languages: string[] = []
    
    if (user?.languages && user.languages.length > 0) {
      languages = user.languages
    } else {
      // Fallback: fetch from GitHub
      const userResponse = await fetch(`https://api.github.com/user/repos?per_page=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      })

      if (userResponse.ok) {
        const repos = await userResponse.json()
        const langSet = new Set<string>()
        repos.forEach((repo: any) => {
          if (repo.language) langSet.add(repo.language)
        })
        languages = Array.from(langSet).slice(0, 5)
      }
    }

    // If no languages found, use popular ones
    if (languages.length === 0) {
      languages = ["JavaScript", "TypeScript", "Python"]
    }

    console.log(`[Discover] Searching for repos with languages: ${languages.join(", ")}`)

    // Search GitHub for repos with good first issues in user's languages
    const repos: any[] = []
    
    for (const language of languages.slice(0, 3)) {
      try {
        // Search for repos with good first issues in this language
        const searchQuery = `language:${language} good-first-issues:>0 stars:>100 archived:false`
        const searchResponse = await fetch(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=10`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        )

        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          repos.push(...searchData.items)
        }
      } catch (error) {
        console.error(`[Discover] Error searching for ${language} repos:`, error)
      }
    }

    // Remove duplicates and limit to 20
    const uniqueRepos = Array.from(
      new Map(repos.map(repo => [repo.id, repo])).values()
    ).slice(0, 20)

    // Transform to our format
    const formattedRepos = uniqueRepos.map((repo: any) => ({
      name: repo.name,
      owner: repo.owner.login,
      description: repo.description || "No description available",
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language || "Unknown",
      languageColor: getLanguageColor(repo.language),
      topics: repo.topics || [],
      openIssues: repo.open_issues_count,
      htmlUrl: repo.html_url,
      goodFirstIssues: 0, // Will be fetched separately
    }))

    // Save or update in MongoDB
    await DiscoveredRepos.findOneAndUpdate(
      { userId },
      {
        userId,
        languages,
        repos: formattedRepos,
        lastFetchedAt: new Date(),
      },
      { upsert: true, new: true }
    )

    console.log(`[Discover] ✅ Cached ${formattedRepos.length} repos for user ${userId}`)

    return NextResponse.json({
      repos: formattedRepos,
      languages,
      cached: false,
    })
  } catch (error) {
    console.error("Error discovering repos:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Failed to discover repos"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

function getLanguageColor(language: string | null): string {
  const colors: Record<string, string> = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    Java: "#b07219",
    Go: "#00ADD8",
    Rust: "#dea584",
    Ruby: "#701516",
    PHP: "#4F5D95",
    "C++": "#f34b7d",
    C: "#555555",
    "C#": "#178600",
    Swift: "#ffac45",
    Kotlin: "#A97BFF",
    Dart: "#00B4AB",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Vue: "#41b883",
    React: "#61dafb",
  }
  return colors[language || ""] || "#8b949e"
}
