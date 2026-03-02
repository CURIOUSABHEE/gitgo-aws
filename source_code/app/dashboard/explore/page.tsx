"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { RepoCard } from "@/components/dashboard/repo-card"
import { RepoDetailsModal } from "@/components/dashboard/repo-details-modal"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Compass, Search, Loader2, RefreshCw } from "lucide-react"

const languageColors: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  Dart: "#00B4AB",
  Ruby: "#701516",
  PHP: "#4F5D95",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Swift: "#ffac45",
  Kotlin: "#A97BFF",
}

const categories = [
  "All",
  "JavaScript",
  "TypeScript",
  "Python",
  "Rust",
  "Go",
  "Java",
]

interface RepoData {
  name: string
  fullName: string
  description: string
  language: string | null
  topics: string[]
  stargazersCount: number
  htmlUrl: string
  goodFirstIssueCount: number
  helpWantedCount: number
  qualityScore: number
}

export default function ExplorePage() {
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; repo: string } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [repos, setRepos] = useState<RepoData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")

  const handleRepoClick = (owner: string, repo: string) => {
    setSelectedRepo({ owner, repo })
    setModalOpen(true)
  }

  const fetchRepos = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: "50",
        language: selectedLanguage,
      })
      const response = await fetch(`/api/repos/explore?${params}`)
      if (!response.ok) throw new Error("Failed to fetch repositories")
      
      const data = await response.json()
      if (data.success) {
        setRepos(data.repos)
      } else {
        throw new Error(data.error || "Unknown error")
      }
    } catch (err: any) {
      console.error("[Explore] Error:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRepos()
  }, [selectedLanguage])

  const filteredRepos = repos.filter((repo) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      repo.name.toLowerCase().includes(query) ||
      repo.description.toLowerCase().includes(query) ||
      repo.topics.some((t) => t.toLowerCase().includes(query))
    )
  })

  const [owner, repoName] = (repo: RepoData) => {
    const parts = repo.fullName.split("/")
    return [parts[0] || "", parts[1] || repo.name]
  }

  return (
    <div className="flex flex-col">
      <DashboardHeader title="Explore" />

      <div className="flex-1 p-6">
        {/* Search and category header */}
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Compass className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                Explore Open Source
              </h2>
              <p className="text-sm text-muted-foreground">
                Discover contributor-friendly repositories from our curated database
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRepos}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search repos, languages, or topics..."
            className="bg-secondary pl-10 text-foreground placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={cat === selectedLanguage ? "default" : "outline"}
              className={
                cat === selectedLanguage
                  ? "bg-primary text-primary-foreground cursor-pointer"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              }
              onClick={() => setSelectedLanguage(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Try running the sync pipeline to populate the database
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredRepos.length === 0 && (
          <div className="rounded-lg border border-border bg-secondary/50 p-12 text-center">
            <Compass className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No repositories found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? "Try adjusting your search query"
                : "Run the sync pipeline to populate the database with repositories"}
            </p>
          </div>
        )}

        {/* Repo grid */}
        {!loading && !error && filteredRepos.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            {filteredRepos.map((repo) => {
              const [owner, repoName] = repo.fullName.split("/")
              return (
                <RepoCard
                  key={repo.fullName}
                  name={repoName || repo.name}
                  owner={owner || ""}
                  description={repo.description}
                  language={repo.language || "Unknown"}
                  languageColor={languageColors[repo.language || ""] || "#858585"}
                  tags={repo.topics.slice(0, 4)}
                  goodFirstIssues={repo.goodFirstIssueCount}
                  homepage={repo.htmlUrl}
                  onCardClick={handleRepoClick}
                />
              )
            })}
          </div>
        )}

        {/* Repository Details Modal */}
        {selectedRepo && (
          <RepoDetailsModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            owner={selectedRepo.owner}
            repo={selectedRepo.repo}
          />
        )}
      </div>
    </div>
  )
}
