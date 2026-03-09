"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Sparkles,
    Loader2,
    Star,
    ExternalLink,
    Search,
    ChevronDown,
    ChevronUp,
    Code2,
    AlertCircle,
    RefreshCw,
    Github,
    User,
    FlaskConical,
    CheckCircle2,
    Circle,
    MessageSquare,
    BookOpen,
    FileText,
    Upload,
} from "lucide-react"
import Link from "next/link"

interface RecommendedRepo {
    name: string
    full_name: string
    html_url: string
    description: string
    stars: number
    language: string
    topics: string[]
    whyItFits: string
    whereToStart: string
}

interface RecommendationCategory {
    domain: string
    label: string
    repos: RecommendedRepo[]
}

interface RecommendationMeta {
    experienceLevel: "none" | "small" | "good" | "frequent"
    hasOSSContributions: boolean
    contributionNotes: string
    strengths?: string[]
    weaknesses?: string[]
    improvements?: string[]
    isTestProfile: boolean
    testUsername?: string
    generatedAt: string
}

type PhaseId = "analyzing" | "github" | "personalizing"

const PHASES: { id: PhaseId; label: string; icon: string }[] = [
    { id: "analyzing", label: "Analyzing Profile", icon: "🔍" },
    { id: "github", label: "Searching GitHub", icon: "🐙" },
    { id: "personalizing", label: "Personalizing Results", icon: "✨" },
]

const LANGUAGE_COLORS: Record<string, string> = {
    TypeScript: "bg-blue-500",
    JavaScript: "bg-yellow-400",
    Python: "bg-green-500",
    Java: "bg-orange-500",
    "C++": "bg-pink-500",
    Go: "bg-cyan-500",
    Rust: "bg-orange-700",
    Ruby: "bg-red-500",
    Swift: "bg-orange-400",
    Kotlin: "bg-purple-500",
    Dart: "bg-sky-500",
    PHP: "bg-violet-500",
}

const LEVEL_CONFIG = {
    none: { color: "text-green-500", bg: "bg-green-500/10 border-green-500/20", label: "🌱 New to OSS" },
    small: { color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", label: "⚡ Getting Started" },
    good: { color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20", label: "🚀 Intermediate" },
    frequent: { color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20", label: "🔥 Top Contributor" },
}

function formatStars(n: number): string {
    if (!n) return "0"
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return String(n)
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return "today"
    if (days === 1) return "yesterday"
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    return `${Math.floor(months / 12)}yr ago`
}

// ─── Issues Quick-View Panel ─────────────────────────────────────────────────

interface QuickIssue {
    number: number
    title: string
    html_url: string
    comments: number
    created_at: string
}

function IssuesPanel({ repoFullName }: { repoFullName: string }) {
    const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
    const [issues, setIssues] = useState<QuickIssue[]>([])
    const [errorMsg, setErrorMsg] = useState("")

    const load = async () => {
        if (status !== "idle") return
        setStatus("loading")
        try {
            const res = await fetch(`/api/repo-issues?repo=${encodeURIComponent(repoFullName)}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed")
            setIssues(data.issues || [])
            setStatus("done")
        } catch (err: any) {
            setErrorMsg(err.message)
            setStatus("error")
        }
    }

    if (status === "idle") {
        return (
            <button
                onClick={load}
                className="flex items-center gap-1 text-xs text-primary/80 hover:text-primary transition-colors font-medium"
            >
                <BookOpen className="h-3 w-3" />
                Show good first issues
            </button>
        )
    }

    return (
        <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <BookOpen className="h-3 w-3" />
                Good First Issues
            </p>

            {status === "loading" && (
                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading issues…
                </div>
            )}

            {status === "error" && (
                <p className="text-xs text-destructive">{errorMsg}</p>
            )}

            {status === "done" && issues.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No open "good first issue" found right now.</p>
            )}

            {status === "done" && issues.length > 0 && (
                <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                    {issues.map(issue => (
                        <li key={issue.number}>
                            <a
                                href={issue.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 px-3 py-2 hover:bg-muted/40 transition-colors group"
                            >
                                <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5">#{issue.number}</span>
                                <span className="text-xs text-foreground flex-1 leading-snug group-hover:text-primary transition-colors">{issue.title}</span>
                                <span className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground">
                                    <MessageSquare className="h-2.5 w-2.5" />
                                    {issue.comments}
                                </span>
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

// ─── Repo Card ────────────────────────────────────────────────────────────────

function RepoCard({ repo, index }: { repo: RecommendedRepo; index: number }) {
    const [expanded, setExpanded] = useState(false)
    const [showIssues, setShowIssues] = useState(false)
    const analyzeUrl = `/dashboard/analyze?repoUrl=${encodeURIComponent(`https://github.com/${repo.full_name}`)}`
    const langColor = LANGUAGE_COLORS[repo.language] || "bg-gray-500"

    return (
        <div className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5">
            <div className="absolute -top-2.5 -left-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">
                {index + 1}
            </div>

            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-foreground truncate">{repo.full_name}</h3>
                        {repo.language && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span className={`inline-block h-2.5 w-2.5 rounded-full ${langColor}`} />
                                {repo.language}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {repo.description || "No description available"}
                    </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{formatStars(repo.stars)}</span>
                </div>
            </div>

            {repo.topics && repo.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {repo.topics.slice(0, 5).map(t => (
                        <Badge key={t} variant="secondary" className="text-[10px] py-0 px-1.5 h-4">{t}</Badge>
                    ))}
                </div>
            )}

            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <p className="text-[11px] font-medium text-primary mb-0.5">✦ Why it fits you</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{repo.whyItFits}</p>
            </div>

            {/* Where to start toggle */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-primary/80 hover:text-primary transition-colors font-medium"
            >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? "Hide" : "Show"} where to start
            </button>

            {expanded && (
                <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
                    <p className="text-[11px] font-medium text-foreground mb-0.5">🚀 Where to start</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{repo.whereToStart}</p>
                </div>
            )}

            {/* Issues quick-view toggle */}
            {!showIssues ? (
                <button
                    onClick={() => setShowIssues(true)}
                    className="flex items-center gap-1 text-xs text-primary/80 hover:text-primary transition-colors font-medium"
                >
                    <BookOpen className="h-3 w-3" />
                    Browse good first issues
                </button>
            ) : (
                <IssuesPanel repoFullName={repo.full_name} />
            )}

            <div className="flex gap-2 pt-1">
                <Link href={analyzeUrl} className="flex-1">
                    <Button size="sm" className="w-full text-xs gap-1.5 h-8">
                        <Search className="h-3 w-3" />
                        Analyse This Repo
                    </Button>
                </Link>
                <a href={repo.html_url || `https://github.com/${repo.full_name}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 h-8">
                        <ExternalLink className="h-3 w-3" />
                        Open in GitHub
                    </Button>
                </a>
            </div>
        </div>
    )
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({ category }: { category: RecommendationCategory }) {
    return (
        <section className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Code2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-foreground">{category.label}</h2>
                    <p className="text-xs text-muted-foreground">{category.repos.length} repositories matched</p>
                </div>
                <Badge className="ml-auto" variant="secondary">{category.repos.length} repos</Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {category.repos.map((repo, i) => (
                    <RepoCard key={`${repo.full_name}-${i}`} repo={repo} index={i} />
                ))}
            </div>
        </section>
    )
}

// ─── Phase Stepper ────────────────────────────────────────────────────────────

function PhaseStepper({ currentPhase }: { currentPhase: PhaseId | null }) {
    const currentIdx = currentPhase ? PHASES.findIndex(p => p.id === currentPhase) : -1

    return (
        <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-8 text-center">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary/60" />
                </div>
                <div>
                    <p className="text-lg font-semibold text-foreground">
                        {currentPhase ? PHASES[currentIdx]?.label : "Starting…"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Hang tight — building your personalized match list
                    </p>
                </div>

                {/* Step indicators */}
                <div className="flex flex-col gap-2 w-full max-w-xs">
                    {PHASES.map((phase, i) => {
                        const isDone = i < currentIdx
                        const isActive = i === currentIdx
                        return (
                            <div
                                key={phase.id}
                                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all duration-300 ${isActive
                                    ? "bg-primary/10 border border-primary/30 text-foreground font-medium"
                                    : isDone
                                        ? "text-muted-foreground"
                                        : "text-muted-foreground/40"
                                    }`}
                            >
                                {isDone ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                ) : isActive ? (
                                    <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" />
                                ) : (
                                    <Circle className="h-4 w-4 shrink-0" />
                                )}
                                <span>{phase.icon} {phase.label}</span>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecommendationsPage() {
    const [loading, setLoading] = useState(false)
    const [currentPhase, setCurrentPhase] = useState<PhaseId | null>(null)
    const [categories, setCategories] = useState<RecommendationCategory[] | null>(null)
    const [meta, setMeta] = useState<RecommendationMeta | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [testUrl, setTestUrl] = useState("")
    const [isTestMode, setIsTestMode] = useState(false)
    const [showResumePrompt, setShowResumePrompt] = useState(false)

    const generateRecommendations = async (useTestUrl?: string, regenerate: boolean = false) => {
        setLoading(true)
        setError(null)
        setCategories(null)
        setMeta(null)
        setCurrentPhase("analyzing")

        try {
            const response = await fetch("/api/recommendations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ testGithubUrl: useTestUrl || undefined, regenerate })
            })

            if (!response.body) throw new Error("No response stream")

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ""
            let streamFinishedSuccessfully = false

            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                // SSE lines are separated by "\n\n"
                const chunks = buffer.split("\n\n")
                buffer = chunks.pop() || ""

                for (const chunk of chunks) {
                    const line = chunk.replace(/^data: /, "").trim()
                    if (!line) continue
                    try {
                        const event = JSON.parse(line)
                        if (event.type === "phase") {
                            setCurrentPhase(event.phase as PhaseId)
                        } else if (event.type === "result") {
                            setCategories(event.categories || [])
                            setMeta(event.meta)
                            setLoading(false)
                            setCurrentPhase(null)
                            streamFinishedSuccessfully = true
                        } else if (event.type === "error") {
                            throw new Error(event.error || "Unknown error")
                        }
                    } catch (parseErr: any) {
                        if (parseErr.message && !parseErr.message.includes("JSON")) {
                            throw parseErr // re-throw real errors
                        }
                        // ignore JSON parse errors on partial chunks
                    }
                }
            }
            
            if (!streamFinishedSuccessfully) {
                 throw new Error("Connection closed unexpectedly before finishing recommendations. Please try again.")
            }
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
            setCurrentPhase(null)
        }
    }

    const handleMyProfile = async () => {
        setIsTestMode(false)
        setTestUrl("")

        try {
            setLoading(true)
            const res = await fetch("/api/user/profile")
            const data = await res.json()
            if (data?.user && !data.user.resumeFileName) {
                setLoading(false)
                setShowResumePrompt(true)
                return
            }
        } catch (err) {
            console.error(err)
        }

        generateRecommendations()
    }

    const continueWithoutResume = () => {
        setShowResumePrompt(false)
        generateRecommendations()
    }

    const handleTestProfile = () => {
        if (!testUrl.trim()) return
        setIsTestMode(true)
        generateRecommendations(testUrl.trim())
    }

    const totalRepos = categories?.reduce((sum, cat) => sum + (cat.repos?.length || 0), 0) || 0
    const levelConfig = meta ? LEVEL_CONFIG[meta.experienceLevel] : null

    return (
        <div className="flex flex-col min-h-full">
            <DashboardHeader title="Smart Matches" />

            <div className="flex-1 p-6 max-w-7xl mx-auto space-y-8 w-full">

                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-8">
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/25">
                                <Sparkles className="h-7 w-7 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">AI-Powered Open Source Matches</h1>
                                <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
                                    Analyzes your GitHub repos, tech stack, and resume. Recommends open-source repos per tech domain —
                                    with personalized reasons based on <strong>your actual projects</strong>. Click any repo card to browse beginner issues instantly.
                                </p>
                            </div>
                        </div>

                        {/* Two action modes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* My Profile */}
                            <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-4">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-semibold text-foreground">Your Profile</span>
                                    <Badge variant="outline" className="text-[10px]">Default</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">Uses your connected GitHub repos, tech stack, skills, and uploaded resume from your account.</p>
                                <Button onClick={handleMyProfile} disabled={loading} className="gap-2 w-full">
                                    {loading && !isTestMode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    {loading && !isTestMode ? "Analyzing…" : "Find My Matches"}
                                </Button>
                            </div>

                            {/* Test with any GitHub profile */}
                            <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                                <div className="flex items-center gap-2">
                                    <FlaskConical className="h-4 w-4 text-amber-500" />
                                    <span className="text-sm font-semibold text-foreground">Test with Any Profile</span>
                                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">Dev Mode</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">Paste any GitHub profile URL to test recommendations with a different developer's history.</p>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Github className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            className="pl-8 h-9 text-xs"
                                            placeholder="https://github.com/torvalds"
                                            value={testUrl}
                                            onChange={e => setTestUrl(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && handleTestProfile()}
                                        />
                                    </div>
                                    <Button
                                        onClick={handleTestProfile}
                                        disabled={loading || !testUrl.trim()}
                                        variant="outline"
                                        size="sm"
                                        className="h-9 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 gap-1.5"
                                    >
                                        {loading && isTestMode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                                        Test
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resume Prompt Modal */}
                {showResumePrompt && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                        <Card className="w-full max-w-md shadow-lg border-primary/20">
                            <CardHeader>
                                <CardTitle className=" flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Missing Resume
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    We notice you haven't uploaded a resume. Adding your resume allows our AI to personalize open-source recommendations based on your work experience and specific tech combinations!
                                </p>
                                <div className="flex flex-col gap-2">
                                    <Link href="/dashboard/portfolio">
                                        <Button className="w-full gap-2">
                                            <Upload className="h-4 w-4" />
                                            Upload Resume Now
                                        </Button>
                                    </Link>
                                    <Button variant="outline" onClick={continueWithoutResume} className="w-full">
                                        Continue without resume
                                    </Button>
                                    <Button variant="ghost" onClick={() => setShowResumePrompt(false)} className="w-full mt-2">
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-sm">Generation Failed</p>
                            <p className="text-xs mt-0.5 opacity-80">{error}</p>
                        </div>
                    </div>
                )}

                {/* Live Phase Stepper */}
                {loading && <PhaseStepper currentPhase={currentPhase} />}

                {/* Developer Profile Summary */}
                {meta && !loading && (
                    <div className={`flex flex-col gap-4 rounded-xl border p-4 ${levelConfig?.bg}`}>
                        <div className="flex flex-wrap items-center gap-4">
                            {meta.isTestProfile && (
                                <div className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                                    <FlaskConical className="h-4 w-4" />
                                    Testing: @{meta.testUsername}
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Experience:</span>
                                <span className={`text-sm font-semibold ${levelConfig?.color}`}>{levelConfig?.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">OSS History:</span>
                                <span className="text-xs font-medium text-foreground">{meta.hasOSSContributions ? "✅ Prior contributions detected" : "🆕 New to open source"}</span>
                            </div>
                            <Button
                                onClick={() => generateRecommendations(isTestMode ? testUrl.trim() : undefined, true)}
                                disabled={loading}
                                variant="ghost"
                                size="sm"
                                className="ml-auto gap-1.5 h-7 text-xs"
                            >
                                <RefreshCw className="h-3 w-3" />
                                Regenerate
                            </Button>
                        </div>
                        {meta.contributionNotes && (
                            <p className="text-xs text-muted-foreground italic w-full">{meta.contributionNotes}</p>
                        )}

                        {/* Analysis Grid */}
                        {((meta.strengths?.length ?? 0) > 0 || (meta.weaknesses?.length ?? 0) > 0 || (meta.improvements?.length ?? 0) > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border/50">
                                {(meta.strengths?.length ?? 0) > 0 && (
                                    <div className="space-y-1.5">
                                        <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                                        </h4>
                                        <ul className="text-[11.5px] space-y-1 text-muted-foreground leading-snug pl-1">
                                            {(meta as any).strengths.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {(meta as any).weaknesses?.length > 0 && (
                                    <div className="space-y-1.5">
                                        <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                            <AlertCircle className="h-3.5 w-3.5" /> Areas to Grow
                                        </h4>
                                        <ul className="text-[11.5px] space-y-1 text-muted-foreground leading-snug pl-1">
                                            {(meta as any).weaknesses.map((w: string, i: number) => <li key={i}>• {w}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {(meta as any).improvements?.length > 0 && (
                                    <div className="space-y-1.5">
                                        <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                            <Sparkles className="h-3.5 w-3.5" /> Next Steps
                                        </h4>
                                        <ul className="text-[11.5px] space-y-1 text-muted-foreground leading-snug pl-1">
                                            {(meta as any).improvements.map((imp: string, i: number) => <li key={i}>• {imp}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Results */}
                {categories && categories.length > 0 && !loading && (
                    <div className="space-y-10">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                <strong className="text-foreground">{totalRepos}</strong> repositories across
                                <strong className="text-foreground"> {categories.length}</strong> tech domains
                            </span>
                            {meta?.generatedAt && (
                                <span className="text-xs text-muted-foreground">
                                    Generated {new Date(meta.generatedAt).toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                        {categories.map((category, i) => (
                            <CategorySection key={category.domain || i} category={category} />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !categories && !error && (
                    <Card className="border-border border-dashed bg-card/50">
                        <CardContent className="flex flex-col items-center justify-center py-24 gap-5 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                                <Sparkles className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-foreground">Ready to Find Your Matches</h3>
                                <p className="text-sm text-muted-foreground mt-2 max-w-md">
                                    Click <strong>Find My Matches</strong> to get repos personalized to you, or paste any GitHub URL in the dev tester.
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                {["GitHub Repos", "Tech Stack", "Resume Skills", "OSS History", "Experience Level"].map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">✓ {tag}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

function extractUsername(input: string): string {
    try {
        const url = new URL(input)
        return url.pathname.split("/").filter(Boolean)[0] || input
    } catch {
        return input.replace("@", "").trim()
    }
}
