"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { TrendingUp, Star, GitFork, ExternalLink, Loader2, AlertCircle, Sparkles } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { RepositoryData, TrendingErrorResponse, TrendingSuccessResponse } from "@/lib/types"

export default function TrendingPage() {
  const [repositories, setRepositories] = useState<RepositoryData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<"cache" | "scraper" | "api" | null>(null)

  const fetchTrending = async () => {
    try {
      const response = await fetch("/api/trending")

      if (!response.ok) {
        throw new Error("Failed to fetch trending repositories")
      }

      const data = (await response.json()) as TrendingSuccessResponse | TrendingErrorResponse

      if ("error" in data) {
        throw new Error(data.error)
      }

      setRepositories(data.repositories || [])
      setSource(data.source)
      setError(null)
    } catch {
      setError("Unable to load trending repositories. Retrying...")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrending()

    const intervalId = setInterval(() => {
      fetchTrending()
    }, 30000)

    return () => clearInterval(intervalId)
  }, [])

  return (
    <div className="flex flex-col">
      <DashboardHeader title="Trending Repositories" />

      <div className="flex-1 p-6">
        {/* Info Banner */}
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Discover Popular Projects
              </h2>
              <p className="text-xs text-muted-foreground">
                Explore the most trending repositories on GitHub right now
                {source === "cache" && " • Cached data"}
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <span className="ml-2 text-xs">Auto-refresh in progress...</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading trending repositories...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && repositories.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                No Trending Repositories
              </h3>
              <p className="text-sm text-muted-foreground">
                No trending repositories available at the moment. Check back soon!
              </p>
            </div>
          </div>
        )}

        {/* Repository Grid */}
        {!loading && repositories.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {repositories.map((repo, index) => (
              <div
                key={`${repo.name}-${index}`}
                className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                {/* Repository Name */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="flex-1 text-base font-semibold text-foreground">
                    <a
                      href={`https://github.com/${repo.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      {repo.name.split("/")[1] || repo.name}
                    </a>
                  </h3>
                  <a
                    href={`https://github.com/${repo.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* Owner */}
                <p className="mb-2 text-xs text-muted-foreground">
                  {repo.name.split("/")[0]}
                </p>

                {/* Description */}
                <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                  {repo.description || "No description available"}
                </p>

                {/* Stats and Language */}
                <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      {repo.stars.toLocaleString()}
                    </span>
                  </div>

                  {repo.language && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {repo.language}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
