/**
 * External Sources Integration
 * Fetches contributor-friendly repos from curated sources
 */

interface ExternalRepo {
  githubId?: number
  name: string
  fullName: string
  description: string
  htmlUrl: string
  language: string | null
  topics: string[]
  stargazersCount: number
  openIssuesCount: number
  forksCount: number
  lastPushedAt: Date
  hasContributingFile: boolean
  hasCI: boolean
  licenseName: string | null
  goodFirstIssueCount: number
  helpWantedCount: number
  source: string
}

/**
 * Fetch repos from goodfirstissue.dev
 */
export async function fetchFromGoodFirstIssue(githubToken: string): Promise<ExternalRepo[]> {
  console.log("[External] Fetching from goodfirstissue.dev")
  
  try {
    const { fetchGoodFirstIssueRepos } = await import("./goodfirstissue-scraper")
    const repos = await fetchGoodFirstIssueRepos(githubToken)
    return repos as ExternalRepo[]
  } catch (error) {
    console.error("[External] Error fetching from goodfirstissue.dev:", error)
    return []
  }
}

/**
 * Fetch repos from up-for-grabs.net
 */
export async function fetchFromUpForGrabs(githubToken: string): Promise<ExternalRepo[]> {
  console.log("[External] Fetching from up-for-grabs.net")
  
  try {
    const response = await fetch("https://up-for-grabs.net/api/projects.json", {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`)
    }

    const projects = await response.json()
    console.log(`[External] Found ${projects.length} projects from up-for-grabs.net`)

    const repos: ExternalRepo[] = []

    // Process each project
    for (const project of projects) {
      try {
        // Extract GitHub repo from link
        const githubMatch = project.link?.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/)
        if (!githubMatch) continue

        const owner = githubMatch[1]
        const repoName = githubMatch[2]
        const fullName = `${owner}/${repoName}`

        // Fetch repo details from GitHub
        const repoData = await fetchGitHubRepoDetails(fullName, githubToken)
        if (!repoData) continue

        repos.push({
          ...repoData,
          source: "upforgrabs",
        })

        // Rate limiting
        if (repos.length % 10 === 0) {
          await sleep(1000)
        }

        // Limit to 100 repos to avoid rate limiting
        if (repos.length >= 100) break
      } catch (error) {
        console.error(`[External] Error processing project ${project.name}:`, error)
      }
    }

    console.log(`[External] Processed ${repos.length} repos from up-for-grabs.net`)
    return repos
  } catch (error) {
    console.error("[External] Error fetching from up-for-grabs.net:", error)
    return []
  }
}

/**
 * Fetch GitHub repository details
 */
async function fetchGitHubRepoDetails(
  fullName: string,
  token: string
): Promise<Omit<ExternalRepo, "source"> | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${fullName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!response.ok) return null

    const repo = await response.json()

    // Skip archived or forked repos
    if (repo.archived || repo.fork) return null

    // Skip repos with low stars
    if (repo.stargazers_count < 100) return null

    // Check for CONTRIBUTING file
    const hasContributingFile = await checkFileExists(
      fullName,
      token,
      ["CONTRIBUTING.md", "CONTRIBUTING", ".github/CONTRIBUTING.md"]
    )

    // Check for CI
    const hasCI = await checkFileExists(
      fullName,
      token,
      [".github/workflows"]
    )

    // Count good first issues
    const goodFirstIssueCount = await countIssues(
      fullName,
      token,
      ["good-first-issue", "good first issue"]
    )

    // Count help wanted issues
    const helpWantedCount = await countIssues(
      fullName,
      token,
      ["help-wanted", "help wanted"]
    )

    return {
      githubId: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || "",
      htmlUrl: repo.html_url,
      language: repo.language,
      topics: repo.topics || [],
      stargazersCount: repo.stargazers_count,
      openIssuesCount: repo.open_issues_count,
      forksCount: repo.forks_count,
      lastPushedAt: new Date(repo.pushed_at),
      hasContributingFile,
      hasCI,
      licenseName: repo.license?.name || null,
      goodFirstIssueCount,
      helpWantedCount,
    }
  } catch (error) {
    console.error(`[External] Error fetching ${fullName}:`, error)
    return null
  }
}

/**
 * Check if file exists in repo
 */
async function checkFileExists(
  fullName: string,
  token: string,
  paths: string[]
): Promise<boolean> {
  for (const path of paths) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${fullName}/contents/${path}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      )

      if (response.ok) return true
    } catch (error) {
      // Continue
    }
  }
  return false
}

/**
 * Count issues by labels
 */
async function countIssues(
  fullName: string,
  token: string,
  labels: string[]
): Promise<number> {
  let maxCount = 0

  for (const label of labels) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${fullName}/issues?labels=${encodeURIComponent(label)}&state=open&per_page=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      )

      if (response.ok) {
        const linkHeader = response.headers.get("Link")
        if (linkHeader) {
          const match = linkHeader.match(/page=(\d+)>; rel="last"/)
          if (match) {
            maxCount = Math.max(maxCount, parseInt(match[1]))
          }
        } else {
          const data = await response.json()
          maxCount = Math.max(maxCount, data.length)
        }
      }
    } catch (error) {
      // Continue
    }
  }

  return maxCount
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetch from all external sources
 */
export async function fetchFromAllExternalSources(githubToken: string): Promise<ExternalRepo[]> {
  console.log("[External] Fetching from all external sources")

  const [goodFirstIssueRepos, upForGrabsRepos] = await Promise.all([
    fetchFromGoodFirstIssue(githubToken),
    fetchFromUpForGrabs(githubToken),
  ])

  const allRepos = [...goodFirstIssueRepos, ...upForGrabsRepos]
  
  // Deduplicate by fullName
  const uniqueRepos = Array.from(
    new Map(allRepos.map(repo => [repo.fullName, repo])).values()
  )

  console.log(`[External] Total unique repos from external sources: ${uniqueRepos.length}`)
  return uniqueRepos
}
