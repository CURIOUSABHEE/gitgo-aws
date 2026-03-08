import mongoose from "mongoose"
import { connectDB } from "@/lib/mongodb"
import User, { IUser } from "@/models/User"
import Repository, { IRepository } from "@/models/Repository"
import { getCached, setCached, deleteCached, CACHE_TTL } from "@/lib/redis"
import { GitHubAPI, GitHubUser, GitHubRepo } from "@/lib/github"

interface UserBasicCache {
  githubId: string
  login: string
  name: string
  email: string
  avatar_url: string
  bio: string
  location: string
  followers: number
  following: number
  public_repos: number
}

interface RepoListCache {
  id: number
  name: string
  full_name: string
  language: string
  stargazers_count: number
  forks_count: number
  updated_at: string
}

export class UserService {
  static async syncUserFromGitHub(
    accessToken: string,
    githubId: string
  ): Promise<IUser> {
    await connectDB()

    const github = new GitHubAPI(accessToken)
    const githubUser = await github.getUser()
    const repos = await github.getRepos()

    // Fetch email if not public
    let email = githubUser.email
    if (!email) {
      try {
        const emails = await github.getUserEmails()
        const primaryEmail = emails.find((e: any) => e.primary)
        email = primaryEmail?.email || emails[0]?.email || ""
      } catch (error) {
        console.log("Could not fetch user emails:", error)
      }
    }

    // Extract languages from repositories
    const languageSet = new Set<string>()
    repos.forEach((repo: GitHubRepo) => {
      if (repo.language) languageSet.add(repo.language)
    })
    const languages = Array.from(languageSet)

    // Extract skills from repo topics and languages
    const skillSet = new Set<string>()
    repos.forEach((repo: GitHubRepo) => {
      if (repo.topics) {
        repo.topics.forEach(topic => skillSet.add(topic))
      }
    })
    const skills = Array.from(skillSet).slice(0, 20) // Limit to top 20 skills

    // Tech stack is combination of languages and popular topics
    const techStack = [...languages, ...Array.from(skillSet).slice(0, 10)]

    // Build technology map: track which technologies are used in which projects
    const technologyMap = new Map<string, {
      technology: string
      projects: Array<{
        repoName: string
        repoId: number
        isPrimary: boolean
        lastUsed: Date
      }>
      totalProjects: number
      firstUsed: Date
      lastUsed: Date
    }>()

    repos.forEach((repo: GitHubRepo) => {
      const repoUpdatedAt = new Date(repo.updated_at)
      
      // Add primary language
      if (repo.language) {
        if (!technologyMap.has(repo.language)) {
          technologyMap.set(repo.language, {
            technology: repo.language,
            projects: [],
            totalProjects: 0,
            firstUsed: repoUpdatedAt,
            lastUsed: repoUpdatedAt,
          })
        }
        const techEntry = technologyMap.get(repo.language)!
        techEntry.projects.push({
          repoName: repo.name,
          repoId: repo.id,
          isPrimary: true,
          lastUsed: repoUpdatedAt,
        })
        techEntry.totalProjects++
        if (repoUpdatedAt < techEntry.firstUsed) techEntry.firstUsed = repoUpdatedAt
        if (repoUpdatedAt > techEntry.lastUsed) techEntry.lastUsed = repoUpdatedAt
      }

      // Add technologies from topics
      if (repo.topics) {
        repo.topics.forEach(topic => {
          if (!technologyMap.has(topic)) {
            technologyMap.set(topic, {
              technology: topic,
              projects: [],
              totalProjects: 0,
              firstUsed: repoUpdatedAt,
              lastUsed: repoUpdatedAt,
            })
          }
          const techEntry = technologyMap.get(topic)!
          techEntry.projects.push({
            repoName: repo.name,
            repoId: repo.id,
            isPrimary: false,
            lastUsed: repoUpdatedAt,
          })
          techEntry.totalProjects++
          if (repoUpdatedAt < techEntry.firstUsed) techEntry.firstUsed = repoUpdatedAt
          if (repoUpdatedAt > techEntry.lastUsed) techEntry.lastUsed = repoUpdatedAt
        })
      }
    })

    const technologyMapArray = Array.from(technologyMap.values())

    // Update or create user in MongoDB
    const user = await User.findOneAndUpdate(
      { githubId },
      {
        githubId: githubUser.id.toString(),
        login: githubUser.login,
        name: githubUser.name || "",
        email: email || "",
        avatar_url: githubUser.avatar_url,
        bio: githubUser.bio || "",
        location: githubUser.location || "",
        blog: githubUser.blog || "",
        company: githubUser.company || "",
        twitter_username: githubUser.twitter_username || "",
        hireable: githubUser.hireable || false,
        public_repos: githubUser.public_repos,
        followers: githubUser.followers,
        following: githubUser.following,
        created_at: new Date(githubUser.created_at),
        lastSynced: new Date(),
        languages,
        skills,
        techStack,
        technologyMap: technologyMapArray,
      },
      { upsert: true, new: true }
    )

    // Cache basic user info
    const basicCache: UserBasicCache = {
      githubId: user.githubId,
      login: user.login,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      bio: user.bio,
      location: user.location,
      followers: user.followers,
      following: user.following,
      public_repos: user.public_repos,
    }
    await setCached(`user:basic:${githubId}`, basicCache, CACHE_TTL.USER_BASIC)

    // Cache languages and skills separately
    await setCached(`user:languages:${githubId}`, languages, CACHE_TTL.USER_BASIC)
    await setCached(`user:skills:${githubId}`, skills, CACHE_TTL.USER_BASIC)

    return user
  }

  static async syncRepositories(
    accessToken: string,
    userId: string,
    githubId: string
  ): Promise<void> {
    await connectDB()

    const github = new GitHubAPI(accessToken)
    const repos = await github.getRepos()

    // Convert userId string to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // Bulk upsert repositories
    const bulkOps = repos.map((repo: GitHubRepo) => ({
      updateOne: {
        filter: { githubId: repo.id },
        update: {
          $set: {
            githubId: repo.id,
            userId: userObjectId,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description || "",
            html_url: repo.html_url,
            language: repo.language || "",
            stargazers_count: repo.stargazers_count,
            forks_count: repo.forks_count,
            topics: repo.topics || [],
            updated_at: new Date(repo.updated_at),
            owner: {
              login: repo.owner?.login || "",
              avatar_url: repo.owner?.avatar_url || "",
            },
            lastSynced: new Date(),
          },
        },
        upsert: true,
      },
    }))

    if (bulkOps.length > 0) {
      await Repository.bulkWrite(bulkOps)
    }

    // Cache repo list (basic info only)
    const repoListCache: RepoListCache[] = repos.map((repo: GitHubRepo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      language: repo.language || "",
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      updated_at: repo.updated_at,
    }))

    await setCached(`repos:list:${githubId}`, repoListCache, CACHE_TTL.REPO_LIST)
  }

  static async getUserBasic(githubId: string): Promise<UserBasicCache | null> {
    // Try cache first
    const cached = await getCached<UserBasicCache>(`user:basic:${githubId}`)
    if (cached) return cached

    // Fallback to database
    await connectDB()
    const user = await User.findOne({ githubId }).lean()
    if (!user) return null

    const basicCache: UserBasicCache = {
      githubId: user.githubId,
      login: user.login,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      bio: user.bio,
      location: user.location,
      followers: user.followers,
      following: user.following,
      public_repos: user.public_repos,
    }

    // Cache for next time
    await setCached(`user:basic:${githubId}`, basicCache, CACHE_TTL.USER_BASIC)

    return basicCache
  }

  static async getUserFull(githubId: string): Promise<IUser | null> {
    await connectDB()
    return User.findOne({ githubId }).lean() as Promise<IUser | null>
  }

  static async getRepoList(githubId: string): Promise<RepoListCache[] | null> {
    // Try cache first
    const cached = await getCached<RepoListCache[]>(`repos:list:${githubId}`)
    if (cached) return cached

    // Fallback to database
    await connectDB()
    const user = await User.findOne({ githubId })
    if (!user) return null

    const repos = await Repository.find({ userId: user._id })
      .sort({ updated_at: -1 })
      .limit(50)
      .lean()

    const repoListCache: RepoListCache[] = repos.map((repo) => ({
      id: repo.githubId,
      name: repo.name,
      full_name: repo.full_name,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      updated_at: repo.updated_at.toISOString(),
    }))

    // Cache for next time
    await setCached(`repos:list:${githubId}`, repoListCache, CACHE_TTL.REPO_LIST)

    return repoListCache
  }

  static async getRepoDetail(repoId: number): Promise<IRepository | null> {
    // Try cache first
    const cached = await getCached<IRepository>(`repo:detail:${repoId}`)
    if (cached) return cached

    // Fallback to database
    await connectDB()
    const repo = await Repository.findOne({ githubId: repoId }).lean() as IRepository | null
    if (!repo) return null

    // Cache for next time
    await setCached(`repo:detail:${repoId}`, repo, CACHE_TTL.REPO_DETAIL)

    return repo
  }

  static async invalidateUserCache(githubId: string): Promise<void> {
    await deleteCached(`user:basic:${githubId}`)
    await deleteCached(`repos:list:${githubId}`)
    await deleteCached(`user:languages:${githubId}`)
    await deleteCached(`user:skills:${githubId}`)
  }

  static async getUserLanguages(githubId: string): Promise<string[]> {
    // Try cache first
    const cached = await getCached<string[]>(`user:languages:${githubId}`)
    if (cached) return cached

    // Fallback to database
    await connectDB()
    const user = await User.findOne({ githubId }).lean()
    if (!user || !user.languages) return []

    // Cache for next time
    await setCached(`user:languages:${githubId}`, user.languages, CACHE_TTL.USER_BASIC)

    return user.languages
  }

  static async getUserSkills(githubId: string): Promise<string[]> {
    // Try cache first
    const cached = await getCached<string[]>(`user:skills:${githubId}`)
    if (cached) return cached

    // Fallback to database
    await connectDB()
    const user = await User.findOne({ githubId }).lean()
    if (!user || !user.skills) return []

    // Cache for next time
    await setCached(`user:skills:${githubId}`, user.skills, CACHE_TTL.USER_BASIC)

    return user.skills
  }

  static async getTechnologyMap(githubId: string) {
    // Try cache first
    const cached = await getCached(`user:techmap:${githubId}`)
    if (cached) return cached

    // Fallback to database
    await connectDB()
    const user = await User.findOne({ githubId }).lean()
    if (!user || !user.technologyMap) return []

    // Cache for next time (1 hour)
    await setCached(`user:techmap:${githubId}`, user.technologyMap, CACHE_TTL.USER_BASIC)

    return user.technologyMap
  }

  static async getTechnologyStats(githubId: string) {
    const techMap = await this.getTechnologyMap(githubId)
    
    // Sort by total projects (most used technologies first)
    const sortedByUsage = [...techMap].sort((a, b) => b.totalProjects - a.totalProjects)
    
    // Sort by last used (most recent technologies)
    const sortedByRecent = [...techMap].sort((a, b) => 
      new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    )

    // Get primary technologies (used as main language in projects)
    const primaryTechnologies = techMap
      .filter(tech => tech.projects.some(p => p.isPrimary))
      .sort((a, b) => b.totalProjects - a.totalProjects)

    return {
      all: techMap,
      mostUsed: sortedByUsage.slice(0, 10),
      recentlyUsed: sortedByRecent.slice(0, 10),
      primary: primaryTechnologies,
      totalTechnologies: techMap.length,
      totalProjects: new Set(techMap.flatMap(t => t.projects.map(p => p.repoId))).size,
    }
  }
}
