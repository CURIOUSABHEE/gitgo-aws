/**
 * Good First Issue Scraper
 * Scrapes goodfirstissue.dev for contributor-friendly repositories
 */

import * as cheerio from "cheerio"

export interface GoodFirstIssueRepo {
  name: string
  fullName: string
  language: string
  stars: number
  lastActivity: string
  url: string
}

/**
 * Scrape repositories from goodfirstissue.dev
 */
export async function scrapeGoodFirstIssue(): Promise<GoodFirstIssueRepo[]> {
  console.log("[GoodFirstIssue] Scraping goodfirstissue.dev")

  try {
    const response = await fetch("https://goodfirstissue.dev/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    const repos: GoodFirstIssueRepo[] = []

    // Parse each repository card
    $("a").each((_, element) => {
      const $el = $(element)
      const href = $el.attr("href")
      
      // Check if this is a GitHub repo link
      if (!href || !href.includes("github.com")) return

      // Extract repo info from the card
      const text = $el.text()
      
      // Extract language
      const langMatch = text.match(/lang:\s*([^\s]+)/)
      const language = langMatch ? langMatch[1] : null

      // Extract stars (format: "1.92K" or "48")
      const starsMatch = text.match(/stars:\s*([\d.]+K?)/)
      let stars = 0
      if (starsMatch) {
        const starsStr = starsMatch[1]
        if (starsStr.includes("K")) {
          stars = Math.round(parseFloat(starsStr.replace("K", "")) * 1000)
        } else {
          stars = parseInt(starsStr)
        }
      }

      // Extract last activity
      const activityMatch = text.match(/last activity:\s*(.+?)(?:lang:|$)/)
      const lastActivity = activityMatch ? activityMatch[1].trim() : ""

      // Extract repo name from URL
      const urlMatch = href.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/)
      if (!urlMatch) return

      const owner = urlMatch[1]
      const repoName = urlMatch[2]
      const fullName = `${owner}/${repoName}`

      // Extract display name (first part of text before "lang:")
      const nameMatch = text.match(/^(.+?)lang:/)
      const name = nameMatch ? nameMatch[1].trim() : repoName

      repos.push({
        name,
        fullName,
        language: language || "Unknown",
        stars,
        lastActivity,
        url: href,
      })
    })

    console.log(`[GoodFirstIssue] Scraped ${repos.length} repositories`)
    return repos
  } catch (error) {
    console.error("[GoodFirstIssue] Scraping error:", error)
    return []
  }
}

/**
 * Convert scraped repos to format compatible with repo fetcher
 */
export async function fetchGoodFirstIssueRepos(githubToken: string) {
  const scrapedRepos = await scrapeGoodFirstIssue()
  const enrichedRepos = []

  console.log(`[GoodFirstIssue] Enriching ${scrapedRepos.length} repos with GitHub data`)

  for (const repo of scrapedRepos) {
    try {
      // Fetch full repo details from GitHub API
      const response = await fetch(`https://api.github.com/repos/${repo.fullName}`, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      })

      if (!response.ok) continue

      const githubData = await response.json()

      // Skip archived or forked repos
      if (githubData.archived || githubData.fork) continue

      // Check for CONTRIBUTING file
      const hasContributingFile = await checkFileExists(
        repo.fullName,
        githubToken,
        ["CONTRIBUTING.md", "CONTRIBUTING", ".github/CONTRIBUTING.md"]
      )

      // Check for CI
      const hasCI = await checkFileExists(
        repo.fullName,
        githubToken,
        [".github/workflows"]
      )

      // Count good first issues
      const goodFirstIssueCount = await countIssues(
        repo.fullName,
        githubToken,
        ["good-first-issue", "good first issue"]
      )

      // Count help wanted issues
      const helpWantedCount = await countIssues(
        repo.fullName,
        githubToken,
        ["help-wanted", "help wanted"]
      )

      enrichedRepos.push({
        githubId: githubData.id,
        name: githubData.name,
        fullName: githubData.full_name,
        description: githubData.description || "",
        htmlUrl: githubData.html_url,
        language: githubData.language,
        topics: githubData.topics || [],
        stargazersCount: githubData.stargazers_count,
        openIssuesCount: githubData.open_issues_count,
        forksCount: githubData.forks_count,
        lastPushedAt: new Date(githubData.pushed_at),
        hasContributingFile,
        hasCI,
        licenseName: githubData.license?.name || null,
        goodFirstIssueCount,
        helpWantedCount,
        source: "goodfirstissue",
      })

      // Rate limiting
      if (enrichedRepos.length % 10 === 0) {
        await sleep(1000)
        console.log(`[GoodFirstIssue] Enriched ${enrichedRepos.length} repos`)
      }
    } catch (error) {
      console.error(`[GoodFirstIssue] Error enriching ${repo.fullName}:`, error)
    }
  }

  console.log(`[GoodFirstIssue] Successfully enriched ${enrichedRepos.length} repos`)
  return enrichedRepos
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
