import { Octokit } from "@octokit/rest"

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
export async function searchRepositoriesRaw(
  searchQuery: string,
  token: string,
  limit: number = 10
): Promise<any[]> {
  const octokit = createOctokit(token);
  const response = await octokit.search.repos({
    q: searchQuery,
    sort: "updated",
    order: "desc",
    per_page: limit,
  });
  return response.data.items;
}

/**
 * Fetches a public GitHub user's profile, repos, languages, and topics.
 * Used for testing personalized recommendations with any GitHub profile URL.
 */
export async function fetchPublicGitHubProfile(username: string, token: string): Promise<{
  name: string;
  login: string;
  bio: string;
  languages: string[];
  skills: string[];
  techStack: string[];
  repos: Array<{ name: string; description: string; language: string; topics: string[]; fork: boolean; html_url: string; full_name: string; stargazers_count: number }>;
}> {
  const octokit = createOctokit(token);

  // Fetch user's repos (up to 30, sorted by updated)
  const reposRes = await octokit.repos.listForUser({
    username,
    per_page: 30,
    sort: "updated",
    type: "all"
  });

  const repos = reposRes.data.map(r => ({
    name: r.name,
    description: r.description || "",
    language: r.language || "",
    topics: r.topics || [],
    fork: r.fork,
    html_url: r.html_url,
    full_name: r.full_name,
    stargazers_count: r.stargazers_count || 0,
  }));

  // Aggregate languages from repos
  const langCount: Record<string, number> = {};
  for (const r of repos) {
    if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
  }
  const languages = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);

  // Aggregate topics as skills
  const topicCount: Record<string, number> = {};
  for (const r of repos) {
    for (const t of r.topics) {
      topicCount[t] = (topicCount[t] || 0) + 1;
    }
  }
  const skills = Object.entries(topicCount)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  // Fetch actual user profile for name/bio
  let name = username;
  let bio = "";
  try {
    const userRes = await octokit.users.getByUsername({ username });
    name = userRes.data.name || username;
    bio = userRes.data.bio || "";
  } catch { /* ignore */ }

  return {
    name,
    login: username,
    bio,
    languages,
    skills: skills.slice(0, 20),
    techStack: skills.slice(0, 15),
    repos
  };
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

const ROUTING_PATTERNS = [
  // Next.js App Router
  "app/page.tsx", "app/page.ts", "app/layout.tsx",
  "app/api",
  // Next.js Pages Router
  "pages/index.tsx", "pages/index.ts", "pages/api",
  // Express / Node
  "routes/", "router.js", "router.ts", "server.js", "server.ts", "app.js", "app.ts", "index.js", "index.ts",
  // Python / Django / FastAPI
  "urls.py", "main.py", "app.py", "routes.py",
  // READMEs
  "README.md", "readme.md", "frontend/README.md", "backend/README.md",
  "FRONTEND_README.md", "BACKEND_README.md",
];

// Get key file contents for analysis
export async function getKeyFileContents(
  owner: string,
  repo: string,
  fileTree: TreeItem[],
  token: string
): Promise<KeyFile[]> {
  const filePaths = fileTree.map((f) => f.path ?? "");
  const priority: string[] = [];

  for (const pattern of ROUTING_PATTERNS) {
    const matches = filePaths.filter(
      (p) => p === pattern || p.startsWith(pattern) || p.endsWith(pattern)
    );
    priority.push(...matches.filter((m) => !priority.includes(m)));
    if (priority.length >= 20) break;
  }

  const results: KeyFile[] = [];
  for (const path of priority.slice(0, 20)) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3.raw",
          },
        }
      )
      if (response.ok) {
        const content = await response.text()
        results.push({
          path,
          content: content.slice(0, 4000), // Max 4KB per file
        })
      }
    } catch (error) {
      console.error(`Failed to fetch ${path}:`, error)
    }
  }

  return results;
}

// Get specific files for route analysis
export async function getSpecificFiles(
  owner: string,
  repo: string,
  filePaths: string[],
  token: string
): Promise<KeyFile[]> {
  const results: KeyFile[] = [];

  for (const filePath of filePaths.slice(0, 10)) {
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
        results.push({ path: filePath, content })
      }
    } catch (error) {
      console.error(`Failed to fetch ${filePath}:`, error)
    }
  }

  return results;
}


// Alias functions for compatibility with existing code
export const getTechStack = detectTechStack

// ─── Ported Octokit Search Methods ───────────────────────────────────────────────────────────────

function createOctokit(token?: string) {
  return new Octokit({
    auth: token || process.env.GITHUB_TOKEN,
    request: { timeout: 15000 },
  })
}

export interface Commit {
  sha: string
  message: string
  author: string
  date: string
  url: string
}

export interface Contributor {
  login: string
  avatar_url: string
  html_url: string
  contributions: number
}

export interface RepoStatus {
  openIssues: number
  closedIssues: number
  openPRs: number
  closedPRs: number
  totalDeployments: number
}

export interface FilteredIssue {
  id: number
  number: number
  title: string
  state: string
  html_url: string
  created_at: string
  user: {
    login: string
    avatar_url: string
  }
  labels: {
    name: string
    color: string
  }[]
  comments: number
}

export async function getCommits(
  owner: string,
  repo: string,
  token?: string
): Promise<{ total: number; recent: Commit[] }> {
  const octokit = createOctokit(token)

  // Fetch recent commits (last 30)
  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    per_page: 30,
  })

  const recent: Commit[] = data.map((c) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split("\n")[0].slice(0, 100),
    author: c.commit.author?.name ?? c.author?.login ?? "Unknown",
    date: c.commit.author?.date ?? "",
    url: c.html_url,
  }))

  // Get total commit count via contributors stats (best estimate)
  let total = recent.length
  try {
    const contributors = await octokit.repos.listContributors({ owner, repo, per_page: 100 })
    total = contributors.data.reduce((sum, c) => sum + (c.contributions ?? 0), 0)
  } catch {
    // Ignore — large repos may timeout on stats
  }

  return { total, recent }
}

export async function getContributors(
  owner: string,
  repo: string,
  token?: string
): Promise<Contributor[]> {
  const octokit = createOctokit(token)
  const { data } = await octokit.repos.listContributors({
    owner,
    repo,
    per_page: 15,
  })

  return data.map((c) => ({
    login: c.login ?? "ghost",
    avatar_url: c.avatar_url ?? "",
    html_url: c.html_url ?? "",
    contributions: c.contributions ?? 0,
  }))
}

export async function getRepoStatus(
  owner: string,
  repo: string,
  token?: string
): Promise<RepoStatus> {
  const octokit = createOctokit(token)

  const [openIssuesRes, closedIssuesRes, openPRsRes, closedPRsRes] = await Promise.allSettled([
    octokit.search.issuesAndPullRequests({ q: `repo:${owner}/${repo} is:issue state:open`, per_page: 1 }),
    octokit.search.issuesAndPullRequests({ q: `repo:${owner}/${repo} is:issue state:closed`, per_page: 1 }),
    octokit.search.issuesAndPullRequests({ q: `repo:${owner}/${repo} is:pr state:open`, per_page: 1 }),
    octokit.search.issuesAndPullRequests({ q: `repo:${owner}/${repo} is:pr state:closed`, per_page: 1 }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getCount(res: PromiseSettledResult<any>): number {
    if (res.status === "fulfilled" && res.value?.data) {
      return res.value.data.total_count ?? 0
    }
    return 0
  }

  let totalDeployments = 0
  try {
    const { data } = await octokit.repos.listDeployments({ owner, repo, per_page: 1 })
    totalDeployments = data.length
  } catch {
    // Deployments may not exist
  }

  return {
    openIssues: getCount(openIssuesRes),
    closedIssues: getCount(closedIssuesRes),
    openPRs: getCount(openPRsRes),
    closedPRs: getCount(closedPRsRes),
    totalDeployments,
  }
}

export async function getFilteredIssues(
  owner: string,
  repo: string,
  options: {
    labels?: string[]
    type?: "issue" | "pr"
    sort?: "created-desc" | "created-asc" | "comments-desc"
  },
  token?: string
): Promise<FilteredIssue[]> {
  const octokit = createOctokit(token)

  let q = `repo:${owner}/${repo}`

  if (options.type) {
    q += ` is:${options.type}`
  } else {
    q += ` is:issue` // Default to issues
  }

  if (options.labels && options.labels.length > 0) {
    // Join labels with a comma for an OR search: label:"bug","enhancement"
    const labelsQuery = options.labels.map(l => `"${l}"`).join(",")
    q += ` label:${labelsQuery}`
  }

  let sortParam: "created" | "updated" | "comments" = "created"
  let orderParam: "desc" | "asc" = "desc"

  if (options.sort === "created-asc") {
    sortParam = "created"
    orderParam = "asc"
  } else if (options.sort === "comments-desc") {
    sortParam = "comments"
    orderParam = "desc"
  }

  try {
    const { data } = await octokit.search.issuesAndPullRequests({
      q,
      sort: sortParam,
      order: orderParam,
      per_page: 30, // Fetch top 30 matching issues
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.items.map((item: any) => ({
      id: item.id,
      number: item.number,
      title: item.title,
      state: item.state,
      html_url: item.html_url,
      created_at: item.created_at,
      user: {
        login: item.user?.login ?? "ghost",
        avatar_url: item.user?.avatar_url ?? "",
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      labels: (item.labels || []).map((l: any) => ({
        name: l.name,
        color: l.color || "6366f1",
      })),
      comments: item.comments,
    }))
  } catch (error) {
    console.error("Failed to fetch filtered issues:", error)
    return []
  }
}

export async function fetchRepoReadme(owner: string, repo: string, token?: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3.raw",
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers,
    })
    if (res.ok) {
      return await res.text()
    }
    return null
  } catch (error) {
    console.error(`Failed to fetch readme for ${owner}/${repo}:`, error)
    return null
  }
}

export async function fetchRepoContributing(owner: string, repo: string, token?: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3.raw",
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/CONTRIBUTING.md`, {
      headers,
    })
    if (res.ok) {
      return await res.text()
    }

    // try lowercase
    const resLower = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/contributing.md`, {
      headers,
    })
    if (resLower.ok) {
      return await resLower.text()
    }
    return null
  } catch (error) {
    console.error(`Failed to fetch contributing for ${owner}/${repo}:`, error)
    return null
  }
}
