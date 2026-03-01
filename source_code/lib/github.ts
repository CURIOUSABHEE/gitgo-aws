export interface GitHubUser {
  login: string
  id: number
  avatar_url: string
  name: string
  email: string
  bio: string
  public_repos: number
  followers: number
  following: number
  created_at: string
  location: string
  blog: string
  company: string
  twitter_username: string
  hireable: boolean
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  language: string
  stargazers_count: number
  forks_count: number
  updated_at: string
  topics: string[]
  owner: {
    login: string
    avatar_url: string
  }
}

export class GitHubAPI {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async fetch(endpoint: string) {
    const response = await fetch(`https://api.github.com${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    return response.json()
  }

  async getUser(): Promise<GitHubUser> {
    return this.fetch("/user")
  }

  async getUserEmails() {
    return this.fetch("/user/emails")
  }

  async getRepos(): Promise<GitHubRepo[]> {
    return this.fetch("/user/repos?sort=updated&per_page=100")
  }

  async getLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    return this.fetch(`/repos/${owner}/${repo}/languages`)
  }

  async getUserOrgs() {
    return this.fetch("/user/orgs")
  }

  async getContributions(username: string) {
    // Note: GitHub doesn't have a direct API for contribution graph
    // You might need to use GraphQL API or scrape the profile page
    return this.fetch(`/users/${username}/events/public?per_page=100`)
  }
}

// Additional types for repository analysis
export interface TreeItem {
  path: string
  type: "blob" | "tree"
  sha?: string
  size?: number
  url?: string
}

export interface KeyFile {
  path: string
  content: string
}

export interface TechStackCategory {
  source: string
  dependencies: string[]
  devDependencies: string[]
}

export interface TechStack {
  frontend?: TechStackCategory
  backend?: TechStackCategory
}

// Fetch repository file tree
export async function getFileTree(
  owner: string,
  repo: string,
  token: string
): Promise<TreeItem[]> {
  // First, get the repository info to find the default branch
  const repoResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  )

  let defaultBranch = "main"
  if (repoResponse.ok) {
    const repoData = await repoResponse.json()
    defaultBranch = repoData.default_branch || "main"
  }

  // Try the default branch first
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  )

  if (!response.ok) {
    // Try 'main' if default branch failed and it's not 'main'
    if (defaultBranch !== "main") {
      const mainResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      )
      
      if (mainResponse.ok) {
        const data = await mainResponse.json()
        return data.tree || []
      }
    }

    // Try 'master' as last resort
    const masterResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    )
    
    if (!masterResponse.ok) {
      const errorData = await masterResponse.json().catch(() => ({}))
      throw new Error(
        `Failed to fetch file tree for ${owner}/${repo}. Tried branches: ${defaultBranch}, main, master. Error: ${errorData.message || masterResponse.statusText}`
      )
    }
    
    const data = await masterResponse.json()
    return data.tree || []
  }

  const data = await response.json()
  return data.tree || []
}

// Fetch repository metadata
export async function getRepoMetadata(
  owner: string,
  repo: string,
  token: string
): Promise<any> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  )

  if (!response.ok) {
    throw new Error("Failed to fetch repository metadata")
  }

  return response.json()
}

// Fetch recent commits
export async function getRecentCommits(
  owner: string,
  repo: string,
  token: string,
  count: number = 10
): Promise<any[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${count}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  )

  if (!response.ok) {
    return []
  }

  return response.json()
}

// Fetch contributors
export async function getContributors(
  owner: string,
  repo: string,
  token: string
): Promise<any[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=20`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  )

  if (!response.ok) {
    return []
  }

  return response.json()
}

// Fetch repository status (issues, PRs)
export async function getRepoStatus(
  owner: string,
  repo: string,
  token: string
): Promise<any> {
  const [openIssues, closedIssues, openPRs, closedPRs] = await Promise.all([
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    ).then((r) => (r.ok ? r.json() : [])),
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=closed&per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    ).then((r) => (r.ok ? r.json() : [])),
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    ).then((r) => (r.ok ? r.json() : [])),
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=closed&per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    ).then((r) => (r.ok ? r.json() : [])),
  ])

  return {
    openIssues: openIssues.length,
    closedIssues: closedIssues.length,
    openPRs: openPRs.length,
    closedPRs: closedPRs.length,
    totalDeployments: 0,
  }
}

// Detect tech stack from file tree
export async function detectTechStack(
  owner: string,
  repo: string,
  fileTree: TreeItem[],
  token: string
): Promise<TechStack> {
  const techStack: TechStack = {}

  // Check for package.json (frontend/backend)
  const packageJson = fileTree.find((f) => f.path === "package.json")
  if (packageJson) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3.raw",
          },
        }
      )
      if (response.ok) {
        const content = await response.text()
        const pkg = JSON.parse(content)
        techStack.frontend = {
          source: "package.json",
          dependencies: Object.keys(pkg.dependencies || {}),
          devDependencies: Object.keys(pkg.devDependencies || {}),
        }
      }
    } catch (error) {
      console.error("Failed to parse package.json:", error)
    }
  }

  // Check for requirements.txt (Python backend)
  const requirementsTxt = fileTree.find((f) => f.path === "requirements.txt")
  if (requirementsTxt) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/requirements.txt`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3.raw",
          },
        }
      )
      if (response.ok) {
        const content = await response.text()
        const deps = content
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"))
          .map((line) => line.split("==")[0].split(">=")[0].trim())
        techStack.backend = {
          source: "requirements.txt",
          dependencies: deps,
          devDependencies: [],
        }
      }
    } catch (error) {
      console.error("Failed to parse requirements.txt:", error)
    }
  }

  return techStack
}

// Get key file contents for analysis
export async function getKeyFileContents(
  owner: string,
  repo: string,
  fileTree: TreeItem[],
  token: string
): Promise<KeyFile[]> {
  const keyFilePatterns = [
    /^README\.md$/i,
    /^package\.json$/,
    /^requirements\.txt$/,
    /^app\.py$/,
    /^main\.py$/,
    /^server\.(js|ts)$/,
    /^index\.(js|ts)$/,
    /^app\/(.*)\/(page|route)\.(tsx?|jsx?)$/,
    /routes?\.(js|ts)$/,
  ]

  const keyFiles = fileTree
    .filter((f) => f.type === "blob" && keyFilePatterns.some((p) => p.test(f.path)))
    .slice(0, 15) // Limit to 15 files

  const contents: KeyFile[] = []

  for (const file of keyFiles) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3.raw",
          },
        }
      )
      if (response.ok) {
        const content = await response.text()
        // Limit content size
        contents.push({
          path: file.path,
          content: content.slice(0, 10000), // Max 10KB per file
        })
      }
    } catch (error) {
      console.error(`Failed to fetch ${file.path}:`, error)
    }
  }

  return contents
}

// Get specific files for route analysis
export async function getSpecificFiles(
  owner: string,
  repo: string,
  filePaths: string[],
  token: string
): Promise<string> {
  let codebaseStr = ""

  for (const filePath of filePaths) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3.raw",
          },
        }
      )
      if (response.ok) {
        const content = await response.text()
        const lines = content.split("\n")
        const numberedLines = lines
          .map((line, idx) => `${idx + 1}:${line}`)
          .join("\n")
        codebaseStr += `\n\n=== FILE: ${filePath} ===\n${numberedLines}`
      }
    } catch (error) {
      console.error(`Failed to fetch ${filePath}:`, error)
    }
  }

  return codebaseStr
}


// Alias functions for compatibility with existing code
export const getCommits = getRecentCommits
export const getTechStack = detectTechStack
