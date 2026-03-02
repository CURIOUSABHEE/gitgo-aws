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

export function SettingsDatabase() {
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Repository Database</h2>
        <p className="text-muted-foreground mt-1">
          Manage the curated open-source repository database for the Explore page
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => fetchStats()}
          disabled={loading}
          variant="outline"
          size="sm"
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
          size="sm"
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
          size="sm"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Database className="h-4 w-4 mr-2" />
          )}
          Sync All Sources
        </Button>
      </div>

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
                  {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}% of total
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
              {topLanguages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {topLanguages.map(([language, count]) => (
                    <Badge key={language} variant="secondary" className="text-sm">
                      {language}: {count}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No languages detected yet</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">No data available</p>
              <Button onClick={() => triggerSync(false)} size="sm">
                <Database className="h-4 w-4 mr-2" />
                Run First Sync
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
