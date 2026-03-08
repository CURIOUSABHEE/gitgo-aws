import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import RepositoryDetails from "@/models/RepositoryDetails"

// Cache duration: 24 hours
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { owner, repo } = await params
    const token = session.accessToken
    const fullName = `${owner}/${repo}`

    console.log(`[Repo Details] Fetching details for ${fullName}`)

    // Connect to MongoDB
    await connectDB()

    // Check if we have cached data
    const cachedRepo = await RepositoryDetails.findOne({ fullName })

    if (cachedRepo) {
      const cacheAge = Date.now() - new Date(cachedRepo.lastFetchedAt).getTime()
      
      // If cache is fresh (less than 24 hours old), return it
      if (cacheAge < CACHE_DURATION_MS) {
        console.log(`[Repo Details] ✅ Cache hit for ${fullName} (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`)
        return NextResponse.json({
          repository: cachedRepo.repository,
          readme: cachedRepo.readme,
          fileStructure: cachedRepo.fileStructure,
          deploymentInfo: cachedRepo.deploymentInfo,
          cached: true,
          cachedAt: cachedRepo.cachedAt,
        })
      }
      
      console.log(`[Repo Details] ⚠️ Cache expired for ${fullName}, refreshing...`)
    } else {
      console.log(`[Repo Details] ❌ Cache miss for ${fullName}, fetching from GitHub...`)
    }

    // Fetch fresh data from GitHub
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    )

    if (!repoResponse.ok) {
      const errorData = await repoResponse.json().catch(() => ({}))
      console.error(`GitHub API error (${repoResponse.status}):`, errorData)
      
      if (repoResponse.status === 404) {
        return NextResponse.json(
          { error: "Repository not found or you don't have access" },
          { status: 404 }
        )
      }
      
      if (repoResponse.status === 403) {
        return NextResponse.json(
          { error: "GitHub API rate limit exceeded or access forbidden" },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: `GitHub API error: ${errorData.message || "Unknown error"}` },
        { status: repoResponse.status }
      )
    }

    const repoData = await repoResponse.json()

    // Fetch README
    let readmeContent = null
    try {
      const readmeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/readme`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3.raw",
          },
        }
      )
      if (readmeResponse.ok) {
        readmeContent = await readmeResponse.text()
      }
    } catch (error) {
      console.log("No README found")
    }

    // Fetch file structure (tree)
    let fileStructure = null
    try {
      const treeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      )
      if (treeResponse.ok) {
        const treeData = await treeResponse.json()
        // Limit to first 100 files to avoid huge responses
        fileStructure = treeData.tree.slice(0, 100)
      }
    } catch (error) {
      console.log("Failed to fetch file structure")
    }

    // Fetch deployment info (check for common deployment files)
    let deploymentInfo = null
    try {
      const deploymentFiles = [
        "vercel.json",
        "netlify.toml",
        ".github/workflows/deploy.yml",
        "Dockerfile",
      ]

      for (const file of deploymentFiles) {
        try {
          const fileResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${file}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
              },
            }
          )
          if (fileResponse.ok) {
            deploymentInfo = {
              hasDeployment: true,
              deploymentFile: file,
            }
            break
          }
        } catch {
          continue
        }
      }
    } catch (error) {
      console.log("No deployment info found")
    }

    // Prepare data for storage
    const repositoryDetails = {
      owner,
      repoName: repo,
      fullName,
      repository: {
        name: repoData.name,
        full_name: repoData.full_name,
        description: repoData.description,
        html_url: repoData.html_url,
        clone_url: repoData.clone_url,
        ssh_url: repoData.ssh_url,
        homepage: repoData.homepage,
        language: repoData.language,
        stargazers_count: repoData.stargazers_count,
        forks_count: repoData.forks_count,
        open_issues_count: repoData.open_issues_count,
        watchers_count: repoData.watchers_count,
        default_branch: repoData.default_branch,
        created_at: repoData.created_at,
        updated_at: repoData.updated_at,
        topics: repoData.topics || [],
        license: repoData.license,
      },
      readme: readmeContent,
      fileStructure,
      deploymentInfo,
      lastFetchedAt: new Date(),
    }

    // Save or update in MongoDB
    await RepositoryDetails.findOneAndUpdate(
      { fullName },
      {
        ...repositoryDetails,
        cachedAt: cachedRepo ? cachedRepo.cachedAt : new Date(),
      },
      { upsert: true, new: true }
    )

    console.log(`[Repo Details] ✅ Cached ${fullName} in MongoDB`)

    return NextResponse.json({
      repository: repositoryDetails.repository,
      readme: repositoryDetails.readme,
      fileStructure: repositoryDetails.fileStructure,
      deploymentInfo: repositoryDetails.deploymentInfo,
      cached: false,
    })
  } catch (error) {
    console.error("Error fetching repository details:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch repository details"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
