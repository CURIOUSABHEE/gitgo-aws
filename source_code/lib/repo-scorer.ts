/**
 * Repository Quality Scorer
 * Calculates a quality score (0-100) for contributor-friendly repositories
 */

interface RepoData {
  stargazersCount: number
  lastPushedAt: Date | string
  goodFirstIssueCount: number
  hasContributingFile: boolean
  hasCI: boolean
  openIssuesCount: number
}

interface ScoreBreakdown {
  starsScore: number
  recencyScore: number
  issuesScore: number
  contributingScore: number
  ciScore: number
  activityScore: number
  totalScore: number
}

/**
 * Calculate quality score for a repository
 * @param repo Repository data
 * @returns Score from 0-100
 */
export function calculateQualityScore(repo: RepoData): number {
  const breakdown = calculateScoreBreakdown(repo)
  return Math.round(breakdown.totalScore)
}

/**
 * Calculate detailed score breakdown
 * @param repo Repository data
 * @returns Detailed score breakdown
 */
export function calculateScoreBreakdown(repo: RepoData): ScoreBreakdown {
  // Stars score (0-20 points) - logarithmic scale
  const starsScore = calculateStarsScore(repo.stargazersCount)

  // Recency score (0-20 points) - based on last push date
  const recencyScore = calculateRecencyScore(repo.lastPushedAt)

  // Good first issues score (0-25 points)
  const issuesScore = calculateIssuesScore(repo.goodFirstIssueCount)

  // Contributing file score (0-15 points)
  const contributingScore = repo.hasContributingFile ? 15 : 0

  // CI/CD score (0-10 points)
  const ciScore = repo.hasCI ? 10 : 0

  // Activity score (0-10 points) - based on open issues
  const activityScore = calculateActivityScore(repo.openIssuesCount)

  // Total score
  const totalScore = starsScore + recencyScore + issuesScore + contributingScore + ciScore + activityScore

  return {
    starsScore,
    recencyScore,
    issuesScore,
    contributingScore,
    ciScore,
    activityScore,
    totalScore: Math.min(100, totalScore),
  }
}

/**
 * Calculate stars score (0-20 points)
 * Uses logarithmic scale to avoid over-weighting mega-popular repos
 */
function calculateStarsScore(stars: number): number {
  if (stars < 100) return 0
  if (stars >= 10000) return 20
  
  // Logarithmic scale: 100 stars = 5pts, 1000 stars = 12pts, 5000 stars = 17pts
  const score = 5 + (Math.log10(stars / 100) * 10)
  return Math.min(20, Math.round(score))
}

/**
 * Calculate recency score (0-20 points)
 * Based on days since last push
 */
function calculateRecencyScore(lastPushedAt: Date | string): number {
  const lastPush = new Date(lastPushedAt)
  const now = new Date()
  const daysSinceLastPush = (now.getTime() - lastPush.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceLastPush <= 7) return 20      // Within a week
  if (daysSinceLastPush <= 30) return 18     // Within a month
  if (daysSinceLastPush <= 90) return 15     // Within 3 months
  if (daysSinceLastPush <= 180) return 10    // Within 6 months
  if (daysSinceLastPush <= 365) return 5     // Within a year
  return 0                                    // Over a year
}

/**
 * Calculate good first issues score (0-25 points)
 * More issues = more opportunities for contributors
 */
function calculateIssuesScore(goodFirstIssueCount: number): number {
  if (goodFirstIssueCount === 0) return 0
  if (goodFirstIssueCount >= 20) return 25
  
  // Linear scale: 1 issue = 5pts, 5 issues = 15pts, 10 issues = 20pts
  const score = Math.min(25, goodFirstIssueCount * 2)
  return Math.round(score)
}

/**
 * Calculate activity score (0-10 points)
 * Based on open issues count (indicates active maintenance)
 */
function calculateActivityScore(openIssuesCount: number): number {
  if (openIssuesCount === 0) return 0        // No activity
  if (openIssuesCount < 5) return 3          // Low activity
  if (openIssuesCount < 20) return 6         // Moderate activity
  if (openIssuesCount < 50) return 8         // Good activity
  if (openIssuesCount < 100) return 10       // High activity
  return 8                                    // Too many issues might indicate poor maintenance
}

/**
 * Check if a repository meets minimum quality threshold
 * @param score Quality score
 * @returns true if score is above threshold
 */
export function meetsQualityThreshold(score: number): boolean {
  return score >= 40
}

/**
 * Get quality tier for a score
 * @param score Quality score
 * @returns Quality tier label
 */
export function getQualityTier(score: number): string {
  if (score >= 80) return "Excellent"
  if (score >= 60) return "Good"
  if (score >= 40) return "Fair"
  return "Poor"
}
