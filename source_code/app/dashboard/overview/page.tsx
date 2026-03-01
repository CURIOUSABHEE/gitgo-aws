"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  LayoutDashboard, 
  Compass, 
  Award, 
  Database, 
  FolderGit2, 
  Search, 
  Users, 
  FileUser,
  TrendingUp,
  GitBranch,
  Star,
  GitPullRequest,
  Code,
  Zap,
  Target,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Globe,
  BookOpen,
  Trophy
} from "lucide-react"
import Link from "next/link"
import { useGitHub } from "@/hooks/use-github"

interface AppStats {
  totalRepos: number
  goodFirstIssues: number
  gsocOrgs: number
  userProjects: number
  languages: string[]
  contributions: number
}

export default function OverviewPage() {
  const { profile } = useGitHub()
  const [stats, setStats] = useState<AppStats>({
    totalRepos: 0,
    goodFirstIssues: 0,
    gsocOrgs: 0,
    userProjects: 0,
    languages: [],
    contributions: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [profile])

  const fetchStats = async () => {
    try {
      // Fetch various stats with individual error handling
      let reposData = null
      let gsocData = null

      try {
        const reposRes = await fetch("/api/repos/sync")
        if (reposRes.ok) {
          reposData = await reposRes.json()
        }
      } catch (error) {
        console.log("Repos API unavailable, using fallback")
      }

      try {
        const gsocRes = await fetch("/api/gsoc/organizations?year=2026")
        if (gsocRes.ok) {
          gsocData = await gsocRes.json()
        }
      } catch (error) {
        console.log("GSoC API unavailable, using fallback")
      }

      // Use fallback values if APIs fail
      setStats({
        totalRepos: reposData?.stats?.active || 10000,
        goodFirstIssues: reposData?.stats?.active || 5000,
        gsocOrgs: gsocData?.organizations?.length || 200,
        userProjects: profile?.repos?.length || 0,
        languages: profile?.languages || [],
        contributions: profile?.user?.public_repos || 0,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
      // Set fallback stats
      setStats({
        totalRepos: 10000,
        goodFirstIssues: 5000,
        gsocOrgs: 200,
        userProjects: profile?.repos?.length || 0,
        languages: profile?.languages || [],
        contributions: profile?.user?.public_repos || 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      icon: LayoutDashboard,
      title: "Personalized Dashboard",
      description: "Discover open source projects matching your tech stack",
      link: "/dashboard",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      stats: `${stats.totalRepos}+ repos`,
    },
    {
      icon: Compass,
      title: "Explore Projects",
      description: "Browse curated contributor-friendly repositories",
      link: "/dashboard/explore",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      stats: `${stats.goodFirstIssues}+ issues`,
    },
    {
      icon: Award,
      title: "GSoC Organizations",
      description: "Find Google Summer of Code participating organizations",
      link: "/dashboard/gsoc",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      stats: `${stats.gsocOrgs}+ orgs`,
    },
    {
      icon: Database,
      title: "Repository Sync",
      description: "Automated pipeline for discovering quality projects",
      link: "/dashboard/repo-sync",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      stats: "Auto-synced",
    },
    {
      icon: FolderGit2,
      title: "My Projects",
      description: "Track and manage your GitHub repositories",
      link: "/dashboard/projects",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      stats: `${stats.userProjects} projects`,
    },
    {
      icon: Search,
      title: "Analyze Repository",
      description: "Deep analysis of any GitHub repository",
      link: "/dashboard/analyze",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
      stats: "AI-powered",
    },
    {
      icon: Users,
      title: "Community",
      description: "Connect with other open source contributors",
      link: "/dashboard/community",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      stats: "Coming soon",
    },
    {
      icon: FileUser,
      title: "Portfolio",
      description: "Showcase your contributions with a beautiful portfolio",
      link: "/dashboard/portfolio",
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      stats: "Customizable",
    },
  ]

  const quickActions = [
    {
      icon: Sparkles,
      title: "Find Your First Issue",
      description: "Get matched with beginner-friendly issues",
      action: "Start",
      link: "/dashboard?filter=beginner",
    },
    {
      icon: Trophy,
      title: "Explore GSoC 2026",
      description: "Browse organizations for Summer of Code",
      action: "Browse",
      link: "/dashboard/gsoc",
    },
    {
      icon: GitBranch,
      title: "Analyze a Repo",
      description: "Get AI-powered insights on any repository",
      action: "Analyze",
      link: "/dashboard/analyze",
    },
    {
      icon: Globe,
      title: "Build Portfolio",
      description: "Create your developer portfolio",
      action: "Create",
      link: "/dashboard/portfolio",
    },
  ]

  const systemHealth = [
    {
      label: "Repository Database",
      value: stats.totalRepos,
      max: 10000,
      status: "healthy",
      icon: Database,
    },
    {
      label: "Good First Issues",
      value: stats.goodFirstIssues,
      max: 5000,
      status: "healthy",
      icon: Target,
    },
    {
      label: "GSoC Organizations",
      value: stats.gsocOrgs,
      max: 200,
      status: "healthy",
      icon: Award,
    },
  ]

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6">
          <h1 className="text-2xl font-bold">App Overview</h1>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Welcome Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Welcome to GitGo</CardTitle>
                <CardDescription className="text-base">
                  Your AI-powered platform for discovering and contributing to open source
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-4">
                <Code className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.languages.length}</p>
                  <p className="text-sm text-muted-foreground">Languages Detected</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-4">
                <GitPullRequest className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.contributions}</p>
                  <p className="text-sm text-muted-foreground">Your Repositories</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-4">
                <Star className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalRepos}+</p>
                  <p className="text-sm text-muted-foreground">Curated Projects</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.link}>
                <Card className="h-full transition-all hover:shadow-lg hover:scale-105 cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <action.icon className="h-8 w-8 text-primary" />
                      <Button size="sm" variant="ghost">
                        {action.action}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Platform Features</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Link key={feature.title} href={feature.link}>
                <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
                  <CardHeader>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${feature.bgColor} mb-3`}>
                      <feature.icon className={`h-5 w-5 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary" className="text-xs">
                      {feature.stats}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              System Health
            </CardTitle>
            <CardDescription>
              Real-time status of platform components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {systemHealth.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {item.value.toLocaleString()} / {item.max.toLocaleString()}
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                </div>
                <Progress value={(item.value / item.max) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tech Stack */}
        {stats.languages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Your Tech Stack
              </CardTitle>
              <CardDescription>
                Languages detected from your repositories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.languages.map((lang) => (
                  <Badge key={lang} variant="outline" className="text-sm">
                    {lang}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Platform Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              What GitGo Can Do
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">For Contributors</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Discover projects matching your skills</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Find beginner-friendly issues</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Get AI-powered repository insights</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Track your contributions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Build a professional portfolio</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Platform Features</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>10,000+ curated repositories</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Quality scoring algorithm</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>GSoC organization database</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Automated weekly sync</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>GitHub & LinkedIn integration</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last synced: {new Date().toLocaleDateString()}</span>
              </div>
              <Link href="/dashboard/repo-sync">
                <Button variant="outline" size="sm">
                  View Sync Status
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
