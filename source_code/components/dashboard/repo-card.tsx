"use client"

import { ExternalLink, Globe } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface RepoCardProps {
  name: string
  owner: string
  description?: string
  language: string
  languageColor: string
  tags: string[]
  goodFirstIssues?: number
  homepage?: string
  onCardClick?: (owner: string, repo: string) => void
}

export function RepoCard({
  name,
  owner,
  description,
  language,
  languageColor,
  tags,
  goodFirstIssues,
  homepage,
  onCardClick,
}: RepoCardProps) {
  const handleReadMore = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onCardClick) {
      onCardClick(owner, name)
    }
  }

  const handleGitHubClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`https://github.com/${owner}/${name}`, '_blank')
  }

  const handleWebsiteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (homepage) {
      window.open(homepage, '_blank')
    }
  }

  return (
    <div className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      {/* Header with Name and Links */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary">
            {owner}/{name}
          </h3>
          {description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {/* Links */}
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 border-border hover:border-primary/30 hover:bg-primary/10"
            onClick={handleGitHubClick}
            title="View on GitHub"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {homepage && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 border-border hover:border-primary/30 hover:bg-primary/10"
              onClick={handleWebsiteClick}
              title="Visit Website"
            >
              <Globe className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className="border-border bg-secondary/50 text-xs font-medium"
          >
            <span
              className="mr-1.5 h-2 w-2 rounded-full"
              style={{ backgroundColor: languageColor }}
            />
            {language}
          </Badge>
          {tags.slice(0, 4).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="border-border bg-secondary/50 text-xs text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Footer with Good First Issues and Read More */}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        {goodFirstIssues !== undefined && goodFirstIssues > 0 ? (
          <Badge 
            variant="secondary" 
            className="border-green-500/30 bg-green-500/10 text-green-400 text-sm font-semibold"
          >
            {goodFirstIssues} good first {goodFirstIssues === 1 ? 'issue' : 'issues'}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">No good first issues</span>
        )}

        <Button
          size="sm"
          variant="outline"
          className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
          onClick={handleReadMore}
        >
          Read More
        </Button>
      </div>
    </div>
  )
}
