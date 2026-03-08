// Types for trending repositories feature

export interface RepositoryData {
  name: string
  description: string
  stars: number
  language: string
}

export interface RepositoryDataWithUrl extends RepositoryData {
  url: string
}

export interface TrendingSuccessResponse {
  repositories: RepositoryData[]
  source: 'scraper' | 'api' | 'cache'
  cachedAt?: string
}

export interface TrendingErrorResponse {
  error: string
  details?: string
}
