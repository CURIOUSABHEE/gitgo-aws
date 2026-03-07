"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  FolderGit2,
  GitPullRequest,
  GitCommit,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  Loader2,
  GitFork,
  FileText,
} from "lucide-react"
import Link from "next/link"
import { useGitHub } from "@/hooks/use-github"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RepoDetailsModal } from "@/components/dashboard/repo-details-modal"

export default function ProjectsPage() {
  const { profile, loading } = useGitHub()
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; repo: string } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleReadMore = (fullName: string) => {
    const [owner, repo] = fullName.split("/")
    setSelectedRepo({ owner, repo })
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <DashboardHeader title="My Projects" />
        <div className="flex flex-1 items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col">
        <DashboardHeader title="My Projects" />
        <div className="flex flex-1 items-center justify-center p-12">
          <p className="text-muted-foreground">No GitHub data available</p>
        </div>
      </div>
    )
  }

  const userRepos = profile.repos.slice(0, 10) // Show top 10 repos
  const totalStars = profile.stats.totalStars
  const totalForks = profile.stats.totalForks

  return (
    <div className="flex flex-col">
      <DashboardHeader title="My Projects" />

      <div className="flex-1 p-6">
        {/* User info section */}
        <div className="mb-8 flex items-center gap-4 rounded-xl border border-border bg-card p-5">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.user.avatar_url} alt={profile.user.name} />
            <AvatarFallback>
              {profile.user.name?.slice(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              {profile.user.name || profile.user.login}
            </h2>
            <p className="text-sm text-muted-foreground">
              @{profile.user.login}
              {profile.user.bio && ` • ${profile.user.bio}`}
            </p>
            {profile.user.location && (
              <p className="mt-1 text-xs text-muted-foreground">
                📍 {profile.user.location}
              </p>
            )}
          </div>
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <p className="font-semibold text-foreground">{profile.user.followers}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">{profile.user.following}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
          </div>
        </div>

        {/* Overview stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {profile.stats.totalRepos}
              </p>
              <p className="text-xs text-muted-foreground">Total Repositories</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-primary">
                {totalStars}
              </p>
              <p className="text-xs text-muted-foreground">Total Stars</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-amber-400">
                {totalForks}
              </p>
              <p className="text-xs text-muted-foreground">Total Forks</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {profile.languages.length}
              </p>
              <p className="text-xs text-muted-foreground">Languages</p>
            </CardContent>
          </Card>
        </div>

        {/* Languages */}
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Languages
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.languages.map((lang) => (
              <Badge
                key={lang}
                variant="outline"
                className="border-primary/20 bg-primary/10 text-primary"
              >
                {lang}
              </Badge>
            ))}
          </div>
        </div>

        {/* Repositories */}
        <section>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FolderGit2 className="h-4 w-4" />
            Recent Repositories ({userRepos.length})
          </h3>
          <div className="grid gap-4">
            {userRepos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} onReadMore={handleReadMore} />
            ))}
          </div>
        </section>

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

function RepoCard({ repo, onReadMore }: { repo: any; onReadMore: (fullName: string) => void }) {
  const languageColors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Java: "#b07219",
    Go: "#00ADD8",
    Rust: "#dea584",
    Ruby: "#701516",
    PHP: "#4F5D95",
    C: "#555555",
    "C++": "#f34b7d",
    "C#": "#178600",
    Swift: "#ffac45",
    Kotlin: "#A97BFF",
    Dart: "#00B4AB",
  }

  const languageColor = repo.language ? languageColors[repo.language] || "#8b949e" : "#8b949e"
  const updatedDate = new Date(repo.updated_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <Card className="border-border bg-card transition-colors hover:border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between gap-4 p-5 pb-3">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-semibold text-foreground hover:text-primary transition-colors"
            >
              {repo.full_name}
            </a>
            {repo.topics && repo.topics.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {repo.topics[0]}
              </Badge>
            )}
          </div>
          {repo.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {repo.description}
            </p>
          )}
        </div>
        {repo.language && (
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: languageColor }}
            />
            <span className="text-xs text-muted-foreground">
              {repo.language}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {repo.stargazers_count}
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="h-3 w-3" />
              {repo.forks_count}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {updatedDate}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReadMore(repo.full_name)}
            >
              <FileText className="mr-1 h-3.5 w-3.5" />
              Read More
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                View
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
