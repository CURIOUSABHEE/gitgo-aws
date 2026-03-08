import { connectDB } from "@/lib/mongodb"
import Portfolio from "@/models/Portfolio"
import { GitHubAPI } from "@/lib/github"

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  updated_at: string
  topics: string[]
  homepage: string | null
  default_branch: string
}

export interface PortfolioData {
  profile: {
    name: string
    bio: string
    tagline: string
    avatar?: string
    location?: string
    email?: string
  }
  socialLinks: {
    github?: string
    linkedin?: string
    twitter?: string
    website?: string
    email?: string
  }
  selectedRepos: Array<{
    repoId: number
    repoName: string
    repoFullName: string
  }>
  theme: string
  username: string
  subdomain: string
  isPublished: boolean
}

export interface DualPortfolioData {
  // MongoDB data
  portfolio: PortfolioData | null
  // GitHub API data
  githubRepos: GitHubRepo[]
  githubUser: {
    login: string
    name: string
    bio: string
    avatar_url: string
    location: string
    html_url: string
    twitter_username: string | null
    blog: string
  } | null
}

/**
 * Fetch portfolio data from MongoDB
 */
export async function getPortfolioFromDB(userId: string): Promise<PortfolioData | null> {
  await connectDB()
  
  const portfolio = await Portfolio.findOne({ userId }).lean()
  if (!portfolio) return null

  return {
    profile: portfolio.profile || {
      name: "",
      bio: "",
      tagline: "",
    },
    socialLinks: portfolio.socialLinks || {},
    selectedRepos: portfolio.selectedRepos || [],
    theme: portfolio.theme || "minimal",
    username: portfolio.username || "",
    subdomain: portfolio.subdomain || "",
    isPublished: portfolio.isPublished || false,
  }
}

/**
 * Fetch GitHub data (user + repos) using access token
 */
export async function getGitHubData(accessToken: string): Promise<{
  repos: GitHubRepo[]
  user: DualPortfolioData["githubUser"]
}> {
  const github = new GitHubAPI(accessToken)
  
  const [user, repos] = await Promise.all([
    github.getUser(),
    github.getRepos(),
  ])

  return {
    repos: repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      updated_at: repo.updated_at,
      topics: repo.topics || [],
      homepage: repo.homepage,
      default_branch: repo.default_branch,
    })),
    user: {
      login: user.login,
      name: user.name || user.login,
      bio: user.bio || "",
      avatar_url: user.avatar_url,
      location: user.location || "",
      html_url: `https://github.com/${user.login}`,
      twitter_username: user.twitter_username,
      blog: user.blog || "",
    },
  }
}

/**
 * Dual Data Fetching: Get portfolio from MongoDB + GitHub data
 * This combines both data sources for the live editor
 */
export async function getDualPortfolioData(
  userId: string,
  accessToken: string
): Promise<DualPortfolioData> {
  const [portfolioData, githubData] = await Promise.all([
    getPortfolioFromDB(userId),
    getGitHubData(accessToken).catch(() => ({ repos: [], user: null })),
  ])

  return {
    portfolio: portfolioData,
    githubRepos: githubData.repos,
    githubUser: githubData.user,
  }
}

/**
 * Save portfolio data to MongoDB
 */
export async function savePortfolio(
  userId: string,
  data: Partial<PortfolioData>
): Promise<PortfolioData> {
  await connectDB()

  const updateData: any = {
    profile: data.profile,
    socialLinks: data.socialLinks,
    selectedRepos: data.selectedRepos,
    theme: data.theme,
  }

  // If username or subdomain changed, update them
  if (data.username) updateData.username = data.username
  if (data.subdomain) updateData.subdomain = data.subdomain
  if (typeof data.isPublished === "boolean") updateData.isPublished = data.isPublished

  const portfolio = await Portfolio.findOneAndUpdate(
    { userId },
    { $set: updateData },
    { new: true, upsert: true }
  )

  return {
    profile: portfolio.profile || {
      name: "",
      bio: "",
      tagline: "",
    },
    socialLinks: portfolio.socialLinks || {},
    selectedRepos: portfolio.selectedRepos || [],
    theme: portfolio.theme || "minimal",
    username: portfolio.username || "",
    subdomain: portfolio.subdomain || "",
    isPublished: portfolio.isPublished || false,
  }
}

/**
 * Get available GitHub repos for a user (public + private with token)
 */
export async function getAvailableRepos(accessToken: string): Promise<GitHubRepo[]> {
  const githubData = await getGitHubData(accessToken)
  return githubData.repos
}
