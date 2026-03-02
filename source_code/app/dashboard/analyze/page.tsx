"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Loader2, AlertCircle, Github } from "lucide-react"
import { LoadingSkeleton } from "@/components/LoadingSkeleton"
import { ResultsDashboard } from "@/components/ResultsDashboard"
import { Alert, AlertDescription } from "@/components/ui/alert"
import toast from "react-hot-toast"

function AnalyzeContent() {
  const searchParams = useSearchParams()
  const initialRepoUrl = searchParams.get("repoUrl") || ""

  const [repoUrl, setRepoUrl] = useState(initialRepoUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [cached, setCached] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasAutoFetched, setHasAutoFetched] = useState(false)

  const handleAnalyze = async (forceRefresh = false, urlToAnalyze = repoUrl) => {
    if (!urlToAnalyze.trim()) {
      setError("Please enter a GitHub repository URL")
      toast.error("Please enter a GitHub repository URL")
      return
    }

    // Validate GitHub URL
    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/
    if (!githubUrlPattern.test(urlToAnalyze.trim())) {
      setError("Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)")
      toast.error("Invalid GitHub URL format")
      return
    }

    // Update URL quietly so "Back" button returns here
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set("repoUrl", urlToAnalyze.trim())
    window.history.replaceState({}, "", newUrl.toString())

    setError(null)
    if (forceRefresh) {
      setIsRefreshing(true)
      toast.loading("Refreshing analysis...", { id: "analyze" })
    } else {
      setLoading(true)
      setAnalysisData(null)
      toast.loading("Analyzing repository...", { id: "analyze" })
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl: urlToAnalyze.trim(),
          forceRefresh,
        }),
      })

      if (!response.ok) {
        let errorMsg = `Request failed with status ${response.status}`
        try {
          const errorData = await response.json()
          errorMsg = errorData.error || errorMsg
        } catch {
          errorMsg = response.statusText || errorMsg
        }
        throw new Error(errorMsg)
      }

      const result = await response.json()
      setAnalysisData(result.data)
      setCached(result.cached && !forceRefresh)

      if (result.cached && !result.stale) {
        toast.success("Analysis loaded from cache", { id: "analyze" })
      } else if (result.stale) {
        toast.success("Analysis loaded (updating in background)", { id: "analyze" })
      } else {
        toast.success("Repository analyzed successfully", { id: "analyze" })
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred"
      setError(errorMsg)
      setAnalysisData(null)
      toast.error(errorMsg, { id: "analyze" })
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Auto-fetch if repoUrl is in searchParams on mount
  useEffect(() => {
    if (initialRepoUrl && !hasAutoFetched) {
      setHasAutoFetched(true)
      handleAnalyze(false, initialRepoUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRepoUrl, hasAutoFetched])

  const handleForceRefresh = () => {
    handleAnalyze(true)
  }

  // Pre-defined examples
  const exampleUrls = [
    "https://github.com/vercel/next.js",
    "https://github.com/facebook/react",
    "https://github.com/microsoft/vscode",
  ]

  return (
    <div className="flex-1 p-6">
      {/* Info Banner */}
      <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Github className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              AI-Powered Repository Analysis
            </h2>
            <p className="text-xs text-muted-foreground">
              Enter any public GitHub repository URL to get detailed insights, architecture diagrams, and route analysis
            </p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <Input
              type="url"
              placeholder="https://github.com/owner/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) {
                  handleAnalyze(false, repoUrl)
                }
              }}
              disabled={loading}
              className="h-11"
            />
          </div>
          <Button
            onClick={() => handleAnalyze(false, repoUrl)}
            disabled={loading || !repoUrl.trim()}
            size="lg"
            className="sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analyze
              </>
            )}
          </Button>
        </div>

        {/* Example URLs */}
        <div className="mt-4 flex flex-wrap gap-2">
          <p className="text-xs text-muted-foreground">Try examples:</p>
          {exampleUrls.map((url) => (
            <button
              key={url}
              onClick={() => {
                setRepoUrl(url)
                handleAnalyze(false, url)
              }}
              disabled={loading}
              className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground disabled:opacity-50"
            >
              {url.split("/").slice(-2).join("/")}
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && <LoadingSkeleton />}

      {/* Results */}
      {analysisData && !loading && (
        <ResultsDashboard
          data={analysisData}
          cached={cached}
          onForceRefresh={handleForceRefresh}
          isRefreshing={isRefreshing}
        />
      )}

      {/* Empty State */}
      {!analysisData && !loading && !error && (
        <div className="flex items-center justify-center py-20">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Github className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              Ready to Analyze
            </h3>
            <p className="text-sm text-muted-foreground">
              Enter a GitHub repository URL above to get started with AI-powered analysis
            </p>
            <div className="mt-6 space-y-2 text-left">
              <p className="text-xs font-semibold text-foreground">What you'll get:</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Repository overview and statistics
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  AI-generated architecture diagram
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Tech stack analysis
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Route and API endpoint analysis
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Commit history and contributors
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnalyzePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader title="Analyze Repository" />
      <Suspense fallback={
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <AnalyzeContent />
      </Suspense>
    </div>
  )
}
