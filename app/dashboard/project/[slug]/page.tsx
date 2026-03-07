import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { FileExplorer } from "@/components/dashboard/file-explorer"
import { AIArchitect } from "@/components/dashboard/ai-architect"
import { Star, GitFork, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function ProjectDeepDivePage() {
  return (
    <div className="flex h-screen flex-col">
      <DashboardHeader title="Project Deep Dive" />

      {/* Project info bar */}
      <div className="flex items-center gap-4 border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-foreground">vercel/next.js</h2>
          <Badge className="bg-primary/15 text-primary border-primary/30">
            98% Match
          </Badge>
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            128K
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="h-3.5 w-3.5" />
            27.2K
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            2.1K
          </span>
        </div>
      </div>

      {/* Split view */}
      <div className="grid flex-1 grid-cols-[280px_1fr] overflow-hidden">
        {/* Left: File Explorer */}
        <FileExplorer />

        {/* Right: AI Architect Panel */}
        <AIArchitect />
      </div>
    </div>
  )
}
