/**
 * GitHub Repository Fetcher
 * Fetches contributor-friendly repositories from GitHub API with rate limiting
 */

interface GitHubSearchResponse {
  total_count: number
  incomplete_results: boolean
  items: GitHubRepoItem[]
}

interface GitHubRepoItem {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  topics: string[]
  stargazers_count: number
  open_issues_count: number
  forks_count: number
  pushed_at: string
  license: {
    name: string
    spdx_id: string
  } | null
  owner: {
    login: string
  }
}

interface FetchedRepoData {
  githubId: number
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
}

export class RepoFetcher {
  private token: string
  private rateLimitRemaining: number = 5000
  private rateLimitReset: number = Date.now()
  private requestCount: number = 0

  constructor(token: string) {
    this.token = token
  }

  /**
   * Fetch contributor-friendly repositories from GitHub
   * @param maxRepos Maximum number of repos to fetch (default: 10000)
   * @returns Array of fetched repository data
   */
  async fetchRepos(maxRepos: number = 10000): Promise<FetchedRepoData[]> {
    console.log(`[RepoFetcher] Starting fetch, target: ${maxRepos} repos`)
    const allRepos: FetchedRepoData[] = []

    // Search queries to maximize coverage
    const searchQueries = [
      'good-first-issue stars:>50 archived:false fork:false pushed:>2024-01-01',
      'help-wanted stars:>50 archived:false fork:false pushed:>2024-01-01',
      'topic:hacktoberfest stars:>50 archived:false fork:false pushed:>2024-01-01',
      'topic:good-first-issue stars:>50 archived:false fork:false',
      'topic:beginner-friendly stars:>50 archived:false fork:false',
      'is:public stars:>200 archived:false fork:false pushed:>2024-01-01 language:javascript',
      'is:public stars:>200 archived:false fork:false pushed:>2024-01-01 language:python',
      'is:public stars:>200 archived:false fork:false pushed:>2024-01-01 language:typescript',
    ]

    for (const query of searchQueries) {
      if (allRepos.length >= maxRepos) break

      console.log(`[RepoFetcher] Searching with query: ${query}`)
      // Fetch more repos per query to ensure we get enough results
      const reposPerQuery = Math.max(50, Math.ceil(maxRepos / searchQueries.length))
      const repos = await this.searchRepos(query, reposPerQuery)

      // Deduplicate by githubId
      const existingIds = new Set(allRepos.map(r => r.githubId))
      const newRepos = repos.filter(r => !existingIds.has(r.githubId))

      allRepos.push(...newRepos)
      console.log(`[RepoFetcher] Found ${newRepos.length} new repos, total: ${allRepos.length}`)
    }

    console.log(`[RepoFetcher] Fetch complete, total repos: ${allRepos.length}`)
    return allRepos
  }

  /**
   * Search GitHub repos with pagination
   */
  private async searchRepos(query: string, maxResults: number): Promise<FetchedRepoData[]> {
    const repos: FetchedRepoData[] = []
    const perPage = 100 // GitHub max
    const maxPages = Math.min(10, Math.ceil(maxResults / perPage)) // GitHub allows max 1000 results (10 pages)

    for (let page = 1; page <= maxPages; page++) {
      await this.checkRateLimit()

      try {
        const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&sort=stars&order=desc`
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/vnd.github.v3+json",
          },
        })

        this.updateRateLimit(response.headers)

        if (!response.ok) {
          console.error(`[RepoFetcher] Search failed: ${response.status} ${response.statusText}`)
          break
        }

        const data: GitHubSearchResponse = await response.json()

        if (data.items.length === 0) {
          console.log(`[RepoFetcher] No more results on page ${page}`)
          break
        }

        // Fetch detailed data for each repo
        for (const item of data.items) {
          if (repos.length >= maxResults) break

          const repoData = await this.fetchRepoDetails(item)
          if (repoData) {
            repos.push(repoData)
          }
        }

        console.log(`[RepoFetcher] Page ${page}/${maxPages}: ${repos.length} repos fetched`)

        if (repos.length >= maxResults) break
      } catch (error) {
        console.error(`[RepoFetcher] Error on page ${page}:`, error)
        break
      }
    }

    return repos
  }

  /**
   * Fetch detailed repository data (optimized - minimal API calls)
   */
  private async fetchRepoDetails(item: GitHubRepoItem): Promise<FetchedRepoData | null> {
    try {
      // Use basic data from search results to avoid extra API calls
      // We'll estimate good first issues from open issues count
      const estimatedGoodFirstIssues = item.open_issues_count > 0 ? Math.max(1, Math.floor(item.open_issues_count * 0.1)) : 0

      return {
        githubId: item.id,
        name: item.name,
        fullName: item.full_name,
        description: item.description || "",
        htmlUrl: item.html_url,
        language: item.language,
        topics: item.topics || [],
        stargazersCount: item.stargazers_count,
        openIssuesCount: item.open_issues_count,
        forksCount: item.forks_count,
        lastPushedAt: new Date(item.pushed_at),
        hasContributingFile: false, // Will be checked later if needed
        hasCI: false, // Will be checked later if needed
        licenseName: item.license?.name || null,
        goodFirstIssueCount: estimatedGoodFirstIssues,
        helpWantedCount: 0,
      }
    } catch (error) {
      console.error(`[RepoFetcher] Error fetching details for ${item.full_name}:`, error)
      return null
    }
  }

  /**
   * Check if file(s) exist in repository
   */
  private async checkFileExists(owner: string, repo: string, paths: string[]): Promise<boolean> {
    for (const path of paths) {
      try {
        await this.checkRateLimit()

        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
          {
            headers: {
              Authorization: `Bearer ${this.token}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        )

        this.updateRateLimit(response.headers)

        if (response.ok) {
          return true
        }
      } catch (error) {
        // File doesn't exist, continue
      }
    }
    return false
  }

  /**
   * Count issues by label
   */
  private async countIssuesByLabel(owner: string, repo: string, labels: string[]): Promise<number> {
    let totalCount = 0

    for (const label of labels) {
      try {
        await this.checkRateLimit()

        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/issues?labels=${encodeURIComponent(label)}&state=open&per_page=1`,
          {
            headers: {
              Authorization: `Bearer ${this.token}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        )

        this.updateRateLimit(response.headers)

        if (response.ok) {
          // GitHub returns total count in Link header
          const linkHeader = response.headers.get("Link")
          if (linkHeader) {
            const match = linkHeader.match(/page=(\d+)>; rel="last"/)
            if (match) {
              totalCount = Math.max(totalCount, parseInt(match[1]))
            }
          } else {
            // If no Link header, check if there are any results
            const data = await response.json()
            totalCount = Math.max(totalCount, data.length)
          }
        }
      } catch (error) {
        // Label doesn't exist or error, continue
      }
    }

    return totalCount
  }

  /**
   * Check rate limit and sleep if necessary
   */
  private async checkRateLimit(): Promise<void> {
    this.requestCount++

    if (this.rateLimitRemaining < 100) {
      const now = Date.now()
      const waitTime = this.rateLimitReset - now

      if (waitTime > 0) {
        console.log(`[RepoFetcher] Rate limit low (${this.rateLimitRemaining}), sleeping for ${Math.ceil(waitTime / 1000)}s`)
        await this.sleep(waitTime)
      }
    }

    // Add small delay between requests to be respectful
    if (this.requestCount % 10 === 0) {
      await this.sleep(1000)
    }
  }

  /**
   * Update rate limit info from response headers
   */
  private updateRateLimit(headers: Headers): void {
    const remaining = headers.get("X-RateLimit-Remaining")
    const reset = headers.get("X-RateLimit-Reset")

    if (remaining) {
      this.rateLimitRemaining = parseInt(remaining)
    }

    if (reset) {
      this.rateLimitReset = parseInt(reset) * 1000 // Convert to milliseconds
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): { remaining: number; reset: Date; requests: number } {
    return {
      remaining: this.rateLimitRemaining,
      reset: new Date(this.rateLimitReset),
      requests: this.requestCount,
    }
  }
}
