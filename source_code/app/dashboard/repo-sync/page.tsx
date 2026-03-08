"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, Database, TrendingUp, Clock, CheckCircle2 } from "lucide-react"
import { toast } from "react-hot-toast"

interface SyncStats {
  total: number
  active: number
  archived: number
  byLanguage: Record<string, number>
  avgQualityScore: number
}

export default function RepoSyncPage() {
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/repos/sync")
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      } else {
        toast.error("Failed to fetch stats")
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast.error("Failed to fetch stats")
    } finally {
      setLoading(false)
    }
  }

  const triggerSync = async (includeExternal: boolean = false) => {
    setSyncing(true)
    const toastId = toast.loading("Starting repository sync...")

    try {
      const response = await fetch("/api/repos/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxRepos: 10000,
          includeExternalSources: includeExternal,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(
          `Sync complete! ${data.upsertResult.inserted} inserted, ${data.upsertResult.updated} updated`,
          { id: toastId, duration: 5000 }
        )
        fetchStats()
      } else {
        toast.error(data.error || "Sync failed", { id: toastId })
      }
    } catch (error) {
      console.error("Sync error:", error)
      toast.error("Sync failed", { id: toastId })
    } finally {
      setSyncing(false)
    }
  }

  const topLanguages = stats?.byLanguage
    ? Object.entries(stats.byLanguage)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
    : []

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Repository Sync Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Manage contributor-friendly repository database for the Explore page
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => fetchStats()}
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button
            onClick={() => triggerSync(false)}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Sync GitHub
          </Button>
          <Button
            onClick={() => triggerSync(true)}
            disabled={syncing}
            variant="secondary"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Sync All Sources
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-500/50 bg-blue-500/10">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <Database className="h-5 w-5 text-blue-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">About This Database</p>
              <p className="text-xs text-muted-foreground">
                This shows stats for the curated open-source repository database used in the Explore page. 
                These are NOT your personal repos - they're contributor-friendly projects from across GitHub. 
                Click "Sync GitHub" to populate the database with repositories that have good first issues.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && !stats ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Repos</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.active.toLocaleString()} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Repos</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.active / stats.total) * 100).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.avgQualityScore.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">Out of 100</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Archived</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.archived.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Stale repos</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Languages</CardTitle>
              <CardDescription>
                Most popular programming languages in the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topLanguages.map(([language, count]) => (
                  <Badge key={language} variant="secondary" className="text-sm">
                    {language}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About the Pipeline</CardTitle>
              <CardDescription>
                How the repository sync works
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">What it does:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Searches GitHub for repos with good-first-issue and help-wanted labels</li>
                  <li>Filters repos with 100+ stars and active development (pushed after June 2024)</li>
                  <li>Scores each repo 0-100 based on quality indicators</li>
                  <li>Stores repos with score ≥40 in MongoDB</li>
                  <li>Optionally fetches from external sources (up-for-grabs.net)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Quality Score Factors:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Stars (20%): Repository popularity</li>
                  <li>Recency (20%): Days since last push</li>
                  <li>Good First Issues (25%): Number of beginner-friendly issues</li>
                  <li>Contributing File (15%): Has CONTRIBUTING.md</li>
                  <li>CI/CD (10%): Has GitHub Actions workflows</li>
                  <li>Activity (10%): Open issues count</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Automatic Sync:</h3>
                <p className="text-sm text-muted-foreground">
                  The pipeline runs automatically every Sunday at midnight via cron job.
                  Repos not synced in 30 days are marked as archived.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
