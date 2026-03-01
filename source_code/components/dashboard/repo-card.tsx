"use client"

import { Star, GitFork, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface RepoCardProps {
  name: string
  owner: string
  description: string
  stars: number
  forks: number
  matchScore: number
  matchReason: string
  language: string
  languageColor: string
  tags: string[]
  goodFirstIssues?: number
  onCardClick?: (owner: string, repo: string) => void
}

export function RepoCard({
  name,
  owner,
  description,
  stars,
  forks,
  matchScore,
  matchReason,
  language,
  languageColor,
  tags,
  goodFirstIssues,
  onCardClick,
}: RepoCardProps) {
  const scoreColor =
    matchScore >= 90
      ? "bg-primary/15 text-primary border-primary/30"
      : matchScore >= 70
        ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
        : "bg-muted text-muted-foreground border-border"

  const handleClick = () => {
    if (onCardClick) {
      onCardClick(owner, name)
    }
  }

  return (
    <div 
      onClick={handleClick}
      className="group block cursor-pointer"
    >
      <div className="rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:bg-secondary/30">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-foreground group-hover:text-primary">
                {owner}/{name}
              </h3>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          {/* Match Score Badge */}
          <div
            className={`flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 ${scoreColor}`}
          >
            <span className="text-lg font-bold leading-none">{matchScore}%</span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider opacity-70">
              Match
            </span>
          </div>
        </div>

        {/* Match Reason */}
        <div className="mt-3 rounded-lg border border-border bg-secondary/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Why it matched: </span>
            {matchReason}
          </p>
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="border-border bg-secondary text-xs text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: languageColor }}
            />
            {language}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            {stars.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="h-3.5 w-3.5" />
            {forks.toLocaleString()}
          </span>
          {/* Always show badge for debugging, even if count is 0 or undefined */}
          {goodFirstIssues !== undefined && (
            <Badge 
              variant="secondary" 
              className="border-green-500/30 bg-green-500/10 text-green-400 text-xs font-semibold"
            >
              {goodFirstIssues} good first {goodFirstIssues === 1 ? 'issue' : 'issues'}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
