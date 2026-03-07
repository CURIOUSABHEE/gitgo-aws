"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ExternalLink,
  GitBranch,
  Star,
  GitFork,
  Eye,
  Calendar,
  FileText,
  FolderTree,
  Globe,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Code2,
  MessageSquare,
} from "lucide-react"
import toast from "react-hot-toast"
import { formatDistanceToNow } from "date-fns"

interface RepoDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  owner: string
  repo: string
}

interface RepoDetails {
  repository: {
    name: string
    full_name: string
    description: string
    html_url: string
    clone_url: string
    ssh_url: string
    homepage: string | null
    language: string
    stargazers_count: number
    forks_count: number
    open_issues_count: number
    watchers_count: number
    default_branch: string
    created_at: string
    updated_at: string
    topics: string[]
    license: { name: string } | null
  }
  readme: string | null
  fileStructure: Array<{ path: string; type: string }> | null
  deploymentInfo: { hasDeployment: boolean; deploymentFile: string } | null
}

interface Issue {
  id: number
  number: number
  title: string
  state: string
  html_url: string
  created_at: string
  updated_at: string
  comments: number
  user: {
    login: string
    avatar_url: string
  }
  labels: Array<{
    name: string
    color: string
  }>
}

export function RepoDetailsModal({
  open,
  onOpenChange,
  owner,
  repo,
}: RepoDetailsModalProps) {
  const [details, setDetails] = useState<RepoDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [cached, setCached] = useState(false)
  const [cachedAt, setCachedAt] = useState<Date | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [issuesError, setIssuesError] = useState<string | null>(null)
  const [issueFilter, setIssueFilter] = useState<"good-first" | "help-wanted" | "bug">("good-first")

  useEffect(() => {
    if (open && owner && repo) {
      fetchRepoDetails()
      fetchIssues()
    }
  }, [open, owner, repo])

  const fetchIssues = async () => {
    setIssuesLoading(true)
    setIssuesError(null)
    try {
      const repoUrl = `https://github.com/${owner}/${repo}`
      // Fetch all open issues - we'll filter client-side
      const response = await fetch(
        `/api/issues?repoUrl=${encodeURIComponent(repoUrl)}&type=issue&sort=created-desc`
      )
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch issues")
      }
      
      const data = await response.json()
      console.log(`[Issues] Fetched ${data.issues?.length || 0} issues for ${owner}/${repo}`)
      setIssues(data.issues || [])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load issues"
      setIssuesError(errorMsg)
      console.error("Error fetching issues:", err)
    } finally {
      setIssuesLoading(false)
    }
  }

  // Filter issues based on selected filter - only show beginner-friendly issues
  const filteredIssues = issues.filter((issue) => {
    const labelNames = issue.labels.map(l => l.name.toLowerCase())
    
    if (issueFilter === "good-first") {
      // Match the same variations as the API endpoint
      return labelNames.some(name => 
        name === "good first issue" ||
        name === "good-first-issue" ||
        name === "beginner friendly" ||
        name === "beginner-friendly" ||
        name === "help wanted" ||
        name === "help-wanted"
      )
    }
    if (issueFilter === "help-wanted") {
      return labelNames.some(name => 
        name === "help wanted" ||
        name === "help-wanted"
      )
    }
    if (issueFilter === "bug") {
      // Only show bugs that are also marked as beginner-friendly
      const isBug = labelNames.includes("bug")
      const isBeginner = labelNames.some(name => 
        name === "good first issue" ||
        name === "good-first-issue" ||
        name === "beginner friendly" ||
        name === "beginner-friendly" ||
        name === "help wanted" ||
        name === "help-wanted"
      )
      return isBug && isBeginner
    }
    
    return false
  })

  const fetchRepoDetails = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/github/repo/${owner}/${repo}`)
      if (!response.ok) {
        throw new Error("Failed to fetch repository details")
      }
      const data = await response.json()
      setDetails(data)
      setCached(data.cached || false)
      setCachedAt(data.cachedAt ? new Date(data.cachedAt) : null)
      
      if (data.cached) {
        toast.success("Repository details loaded from cache")
      } else {
        toast.success("Repository details loaded")
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred"
      setError(errorMsg)
      toast.error(`Failed to load repository: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedUrl(type)
    toast.success(`${type.toUpperCase()} URL copied to clipboard`)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Build file tree structure
  const buildFileTree = (files: Array<{ path: string; type: string }>) => {
    const tree: any = {}
    files.forEach((file) => {
      const parts = file.path.split("/")
      let current = tree
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 && file.type === "blob" ? null : {}
        }
        current = current[part]
      })
    })
    return tree
  }

  const renderFileTree = (tree: any, level = 0): React.ReactElement[] => {
    return Object.keys(tree).map((key) => {
      const isFile = tree[key] === null
      return (
        <div key={key} style={{ paddingLeft: `${level * 16}px` }}>
          <div className="flex items-center gap-2 py-1 text-sm">
            {isFile ? (
              <>
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground">{key}</span>
              </>
            ) : (
              <>
                <FolderTree className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">{key}/</span>
              </>
            )}
          </div>
          {!isFile && renderFileTree(tree[key], level + 1)}
        </div>
      )
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Repository Details
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        )}

        {details && !loading && (
          <div className="space-y-4 overflow-y-auto pr-2">
            {/* Cache indicator */}
            {cached && cachedAt && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
                <span className="text-amber-400">⚡</span>
                <span className="text-amber-300">
                  Loaded from cache • Last updated {new Date(cachedAt).toLocaleString()}
                </span>
              </div>
            )}

            {/* Repository Header */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">
                    {details.repository.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {details.repository.description || "No description"}
                  </p>
                </div>
                <Button asChild size="sm">
                  <a
                    href={details.repository.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in GitHub
                  </a>
                </Button>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  {details.repository.stargazers_count} stars
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="h-4 w-4" />
                  {details.repository.forks_count} forks
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {details.repository.watchers_count} watchers
                </span>
                <span className="flex items-center gap-1">
                  <GitBranch className="h-4 w-4" />
                  {details.repository.default_branch}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Updated {formatDate(details.repository.updated_at)}
                </span>
              </div>

              {/* Topics */}
              {details.repository.topics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {details.repository.topics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Links Section */}
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
              <h4 className="text-sm font-semibold text-foreground">Quick Links</h4>
              <div className="grid gap-2">
                {/* Clone URLs */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">HTTPS:</span>
                  <code className="flex-1 rounded bg-background px-2 py-1 text-xs text-foreground">
                    {details.repository.clone_url}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(details.repository.clone_url, "https")
                    }
                  >
                    {copiedUrl === "https" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">SSH:</span>
                  <code className="flex-1 rounded bg-background px-2 py-1 text-xs text-foreground">
                    {details.repository.ssh_url}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(details.repository.ssh_url, "ssh")
                    }
                  >
                    {copiedUrl === "ssh" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>

                {/* Homepage/Deployment */}
                {details.repository.homepage && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={details.repository.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {details.repository.homepage}
                    </a>
                  </div>
                )}

                {details.deploymentInfo?.hasDeployment && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      Deployment configured: {details.deploymentInfo.deploymentFile}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs for File Structure and Issues */}
            <Tabs defaultValue="issues" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="issues">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Issues {filteredIssues.length > 0 && `(${filteredIssues.length})`}
                </TabsTrigger>
                <TabsTrigger value="structure">
                  <FolderTree className="mr-2 h-4 w-4" />
                  File Structure
                </TabsTrigger>
              </TabsList>

              <TabsContent value="issues" className="mt-4">
                {/* Filter buttons - only beginner-friendly categories */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={issueFilter === "good-first" ? "default" : "outline"}
                    onClick={() => setIssueFilter("good-first")}
                  >
                    Good First Issue ({issues.filter(i => {
                      const labelNames = i.labels.map(l => l.name.toLowerCase())
                      return labelNames.some(name => 
                        (name.includes("good") && name.includes("first")) ||
                        name.includes("beginner") ||
                        name === "help wanted" ||
                        name === "help-wanted"
                      )
                    }).length})
                  </Button>
                  <Button
                    size="sm"
                    variant={issueFilter === "help-wanted" ? "default" : "outline"}
                    onClick={() => setIssueFilter("help-wanted")}
                  >
                    Help Wanted ({issues.filter(i => i.labels.some(l => l.name.toLowerCase().includes("help") && l.name.toLowerCase().includes("wanted"))).length})
                  </Button>
                  <Button
                    size="sm"
                    variant={issueFilter === "bug" ? "default" : "outline"}
                    onClick={() => setIssueFilter("bug")}
                  >
                    Beginner Bugs ({issues.filter(i => {
                      const labelNames = i.labels.map(l => l.name.toLowerCase())
                      const isBug = labelNames.includes("bug")
                      const isBeginner = labelNames.some(name => 
                        (name.includes("good") && name.includes("first")) ||
                        name.includes("beginner") ||
                        name.includes("help") && name.includes("wanted")
                      )
                      return isBug && isBeginner
                    }).length})
                  </Button>
                </div>

                <ScrollArea className="h-[50vh] rounded-lg border border-border bg-background">
                  {issuesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : issuesError ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <p>{issuesError}</p>
                    </div>
                  ) : filteredIssues.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <p>No beginner-friendly {issueFilter === "bug" ? "bugs" : "issues"} found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredIssues.map((issue) => (
                        <a
                          key={issue.id}
                          href={issue.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 p-4 transition-colors hover:bg-secondary/50"
                        >
                          {/* Icon */}
                          <div className="mt-1 flex-shrink-0">
                            {issue.state === "open" ? (
                              <svg className="h-4 w-4 text-green-500" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                                <path fillRule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4 text-purple-500" viewBox="0 0 16 16" fill="currentColor">
                                <path fillRule="evenodd" d="M1.5 8a6.5 6.5 0 0110.65-5.09.75.75 0 001.07-1.05A8 8 0 1016 8a.75.75 0 00-1.5 0 6.5 6.5 0 01-1.39 4.02l1.64 1.64a.75.75 0 001.06-1.06l-1.64-1.64A6.5 6.5 0 011.5 8zm2.47-2.47a.75.75 0 111.06-1.06l4.03 4.03-1.06 1.06-4.03-4.03z" />
                              </svg>
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <h4 className="font-medium text-foreground hover:text-primary transition-colors">
                                {issue.title}
                              </h4>
                            </div>

                            {/* Labels */}
                            {issue.labels.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {issue.labels.map((label) => (
                                  <span
                                    key={label.name}
                                    className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                                    style={{
                                      backgroundColor: `#${label.color}20`,
                                      borderColor: `#${label.color}40`,
                                      color: `#${label.color}`,
                                    }}
                                  >
                                    {label.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Meta */}
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>#{issue.number}</span>
                              <span>•</span>
                              <span>opened {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</span>
                              <span>•</span>
                              <span>by {issue.user.login}</span>
                              {issue.comments > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {issue.comments}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Author Avatar */}
                          <div className="hidden sm:block flex-shrink-0">
                            <img
                              src={issue.user.avatar_url}
                              alt={issue.user.login}
                              className="h-6 w-6 rounded-full border border-border"
                              loading="lazy"
                            />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="structure" className="mt-4">
                <ScrollArea className="h-[50vh] rounded-lg border border-border bg-background p-4">
                  {details.fileStructure && details.fileStructure.length > 0 ? (
                    <div className="font-mono text-xs">
                      {renderFileTree(buildFileTree(details.fileStructure))}
                      {details.fileStructure.length >= 100 && (
                        <p className="mt-4 text-muted-foreground">
                          Showing first 100 files...
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <p>Unable to load file structure</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
