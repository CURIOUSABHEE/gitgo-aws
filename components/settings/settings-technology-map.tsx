"use client"

import { useEffect, useState } from "react"
import { Loader2, Code2, TrendingUp, Clock, Star } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TechnologyEntry {
  technology: string
  projects: Array<{
    repoName: string
    repoId: number
    isPrimary: boolean
    lastUsed: string
  }>
  totalProjects: number
  firstUsed: string
  lastUsed: string
}

interface TechnologyStats {
  all: TechnologyEntry[]
  mostUsed: TechnologyEntry[]
  recentlyUsed: TechnologyEntry[]
  primary: TechnologyEntry[]
  totalTechnologies: number
  totalProjects: number
}

export function SettingsTechnologyMap() {
  const [stats, setStats] = useState<TechnologyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTechnologyMap = async () => {
      try {
        const response = await fetch("/api/github/technology-map")
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch technology map:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTechnologyMap()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No technology data available yet. Sync your GitHub repositories first.
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }

  return (
    <div className="max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Technology Map</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track which technologies you've used across your projects
        </p>
      </div>

      <Separator className="my-6" />

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Technologies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.totalTechnologies}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.totalProjects}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Primary Languages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.primary.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technology Lists */}
      <Tabs defaultValue="most-used" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="most-used">
            <TrendingUp className="h-4 w-4 mr-2" />
            Most Used
          </TabsTrigger>
          <TabsTrigger value="recent">
            <Clock className="h-4 w-4 mr-2" />
            Recently Used
          </TabsTrigger>
          <TabsTrigger value="primary">
            <Star className="h-4 w-4 mr-2" />
            Primary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="most-used" className="mt-6">
          <div className="space-y-4">
            {stats.mostUsed.map((tech) => (
              <Card key={tech.technology}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Code2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{tech.technology}</CardTitle>
                        <CardDescription>
                          Used in {tech.totalProjects} project{tech.totalProjects !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {tech.totalProjects} {tech.totalProjects === 1 ? "project" : "projects"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tech.projects.slice(0, 5).map((project) => (
                      <Badge
                        key={project.repoId}
                        variant={project.isPrimary ? "default" : "outline"}
                        className="text-xs"
                      >
                        {project.repoName}
                        {project.isPrimary && " ⭐"}
                      </Badge>
                    ))}
                    {tech.projects.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{tech.projects.length - 5} more
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    First used: {formatDate(tech.firstUsed)} • Last used: {formatDate(tech.lastUsed)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="mt-6">
          <div className="space-y-4">
            {stats.recentlyUsed.map((tech) => (
              <Card key={tech.technology}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Code2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{tech.technology}</CardTitle>
                        <CardDescription>
                          Last used: {formatDate(tech.lastUsed)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {tech.totalProjects} {tech.totalProjects === 1 ? "project" : "projects"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tech.projects.slice(0, 5).map((project) => (
                      <Badge
                        key={project.repoId}
                        variant={project.isPrimary ? "default" : "outline"}
                        className="text-xs"
                      >
                        {project.repoName}
                        {project.isPrimary && " ⭐"}
                      </Badge>
                    ))}
                    {tech.projects.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{tech.projects.length - 5} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="primary" className="mt-6">
          <div className="space-y-4">
            {stats.primary.map((tech) => (
              <Card key={tech.technology}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Code2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{tech.technology}</CardTitle>
                        <CardDescription>
                          Primary language in {tech.projects.filter(p => p.isPrimary).length} project
                          {tech.projects.filter(p => p.isPrimary).length !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="default">Primary</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tech.projects
                      .filter(p => p.isPrimary)
                      .slice(0, 5)
                      .map((project) => (
                        <Badge key={project.repoId} variant="default" className="text-xs">
                          {project.repoName} ⭐
                        </Badge>
                      ))}
                    {tech.projects.filter(p => p.isPrimary).length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{tech.projects.filter(p => p.isPrimary).length - 5} more
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    First used: {formatDate(tech.firstUsed)} • Last used: {formatDate(tech.lastUsed)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
