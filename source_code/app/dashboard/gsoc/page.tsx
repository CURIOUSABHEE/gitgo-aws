"use client"

import React, { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Award, Search, ExternalLink, Code2, Users, Calendar, Filter } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { gsoc2026Organizations } from "@/lib/gsoc-fallback-data"

interface GsocOrg {
  name: string
  description: string
  technologies: string[]
  category: string
  url: string
  ideas_list?: string
  contact_email?: string
  irc_channel?: string
  topics: string[]
  year: number
}
const gsocOrgs: GsocOrg[] = [
  {
    name: "Python Software Foundation",
    description: "Python is a programming language that lets you work quickly and integrate systems more effectively.",
    technologies: ["Python", "Django", "Flask", "NumPy", "Pandas"],
    category: "Programming Languages",
    url: "https://www.python.org/",
    ideas_list: "https://python-gsoc.org/",
    topics: ["web", "data-science", "machine-learning", "automation"],
    year: 2026,
  },
  {
    name: "Mozilla",
    description: "Mozilla is the not-for-profit behind Firefox, fighting for a healthy internet for all.",
    technologies: ["JavaScript", "Rust", "C++", "Python", "WebAssembly"],
    category: "Web Browsers",
    url: "https://www.mozilla.org/",
    ideas_list: "https://wiki.mozilla.org/Community:SummerOfCode",
    topics: ["browser", "privacy", "security", "web-standards"],
    year: 2026,
  },
  {
    name: "TensorFlow",
    description: "An end-to-end open source machine learning platform for everyone.",
    technologies: ["Python", "C++", "TensorFlow", "Keras", "JAX"],
    category: "Machine Learning",
    url: "https://www.tensorflow.org/",
    ideas_list: "https://github.com/tensorflow/community/tree/master/sigs",
    topics: ["ai", "machine-learning", "deep-learning", "neural-networks"],
    year: 2026,
  },
  {
    name: "Apache Software Foundation",
    description: "The Apache Software Foundation provides support for the Apache community of open-source software projects.",
    technologies: ["Java", "Scala", "Python", "Go", "C++"],
    category: "Software Development",
    url: "https://www.apache.org/",
    ideas_list: "https://community.apache.org/gsoc.html",
    topics: ["big-data", "cloud", "web-server", "databases"],
    year: 2026,
  },
  {
    name: "CNCF",
    description: "Building sustainable ecosystems for cloud native software.",
    technologies: ["Go", "Kubernetes", "Docker", "Rust", "Python"],
    category: "Cloud & DevOps",
    url: "https://www.cncf.io/",
    ideas_list: "https://github.com/cncf/mentoring",
    topics: ["kubernetes", "containers", "cloud-native", "devops"],
    year: 2026,
  },
  {
    name: "PostgreSQL",
    description: "The world's most advanced open source relational database.",
    technologies: ["C", "SQL", "PostgreSQL", "PL/pgSQL"],
    category: "Databases",
    url: "https://www.postgresql.org/",
    ideas_list: "https://wiki.postgresql.org/wiki/GSoC",
    topics: ["database", "sql", "data-storage", "backend"],
    year: 2026,
  },
  {
    name: "Git",
    description: "Git is a free and open source distributed version control system.",
    technologies: ["C", "Shell", "Perl", "Python"],
    category: "Version Control",
    url: "https://git-scm.com/",
    ideas_list: "https://git.github.io/SoC-2024-Ideas/",
    topics: ["version-control", "devtools", "collaboration"],
    year: 2026,
  },
  {
    name: "Kubernetes",
    description: "Production-Grade Container Orchestration.",
    technologies: ["Go", "Kubernetes", "Docker", "YAML"],
    category: "Cloud & DevOps",
    url: "https://kubernetes.io/",
    ideas_list: "https://github.com/kubernetes/community/tree/master/mentoring",
    topics: ["containers", "orchestration", "cloud", "devops"],
    year: 2026,
  },
  {
    name: "NumPy",
    description: "The fundamental package for scientific computing with Python.",
    technologies: ["Python", "C", "NumPy", "Cython"],
    category: "Scientific Computing",
    url: "https://numpy.org/",
    ideas_list: "https://github.com/numpy/numpy/wiki/GSoC-2024-project-ideas",
    topics: ["data-science", "scientific-computing", "mathematics"],
    year: 2026,
  },
  {
    name: "Django",
    description: "The web framework for perfectionists with deadlines.",
    technologies: ["Python", "Django", "JavaScript", "PostgreSQL"],
    category: "Web Frameworks",
    url: "https://www.djangoproject.com/",
    ideas_list: "https://code.djangoproject.com/wiki/SummerOfCode2024",
    topics: ["web", "backend", "framework", "python"],
    year: 2026,
  },
  {
    name: "Rust",
    description: "A language empowering everyone to build reliable and efficient software.",
    technologies: ["Rust", "LLVM", "C++"],
    category: "Programming Languages",
    url: "https://www.rust-lang.org/",
    ideas_list: "https://github.com/rust-lang/google-summer-of-code",
    topics: ["systems-programming", "performance", "safety"],
    year: 2026,
  },
  {
    name: "React",
    description: "A JavaScript library for building user interfaces.",
    technologies: ["JavaScript", "TypeScript", "React", "React Native"],
    category: "Web Development",
    url: "https://react.dev/",
    topics: ["frontend", "ui", "mobile", "web"],
    year: 2026,
  },
]

const categories = [
  "All",
  "Artificial Intelligence",
  "Data",
  "Development tools",
  "End user applications",
  "Infrastructure and cloud",
  "Media",
  "Operating systems",
  "Other",
  "Programming languages",
  "Science and medicine",
  "Security",
  "Social and communication",
  "Web",
]

export default function GsocPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [sortBy, setSortBy] = useState<"name" | "tech-count" | "popularity" | "beginner-friendly">("name")
  const [filteredOrgs, setFilteredOrgs] = useState<GsocOrg[]>([])
  const [allOrgs, setAllOrgs] = useState<GsocOrg[]>(gsoc2026Organizations)
  const [loading, setLoading] = useState(true)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [minTechCount, setMinTechCount] = useState(0)
  const [maxTechCount, setMaxTechCount] = useState(100)
  const [cacheInfo, setCacheInfo] = useState<{ cached: boolean; fetchedAt?: Date; expiresAt?: Date } | null>(null)

  // Calculate category counts
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    allOrgs.forEach((org) => {
      counts[org.category] = (counts[org.category] || 0) + 1
    })
    return counts
  }, [allOrgs])

  // Fetch organizations from API
  useEffect(() => {
    const fetchOrganizations = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/gsoc/organizations?year=2026")
        if (response.ok) {
          const data = await response.json()
          if (data.organizations && data.organizations.length > 0) {
            console.log(`[GSoC] Loaded ${data.organizations.length} organizations from API`)
            setAllOrgs(data.organizations)
            setCacheInfo({
              cached: data.cached || false,
              fetchedAt: data.fetchedAt ? new Date(data.fetchedAt) : undefined,
              expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
            })
          } else {
            console.log("[GSoC] Using fallback data")
            setAllOrgs(gsoc2026Organizations)
            setCacheInfo(null)
          }
        } else {
          console.log("[GSoC] API failed, using fallback data")
          setAllOrgs(gsoc2026Organizations)
          setCacheInfo(null)
        }
      } catch (error) {
        console.error("[GSoC] Error fetching organizations:", error)
        setAllOrgs(gsoc2026Organizations)
        setCacheInfo(null)
      } finally {
        setLoading(false)
      }
    }

    fetchOrganizations()
  }, [])

  useEffect(() => {
    let filtered = allOrgs

    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter((org) => org.category === selectedCategory)
    }

    // Filter by tech count range
    filtered = filtered.filter(
      (org) => org.technologies.length >= minTechCount && org.technologies.length <= maxTechCount
    )

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (org) =>
          org.name.toLowerCase().includes(query) ||
          org.description.toLowerCase().includes(query) ||
          org.technologies.some((tech) => tech.toLowerCase().includes(query)) ||
          org.topics.some((topic) => topic.toLowerCase().includes(query))
      )
    }

    // Sort organizations
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "tech-count":
          return b.technologies.length - a.technologies.length
        case "popularity":
          // Estimate popularity by number of topics/tags
          return b.topics.length - a.topics.length
        case "beginner-friendly":
          // Organizations with more diverse tech stack are often more beginner-friendly
          const aScore = a.technologies.length + a.topics.length
          const bScore = b.technologies.length + b.topics.length
          return bScore - aScore
        default:
          return 0
      }
    })

    setFilteredOrgs(sorted)
  }, [searchQuery, selectedCategory, allOrgs, sortBy, minTechCount, maxTechCount])

  return (
    <div className="flex flex-col">
      <DashboardHeader title="GSoC Organizations" />

      <div className="flex-1 p-6">
        {/* Header */}
        <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Google Summer of Code 2024
              </h2>
              <p className="text-sm text-muted-foreground">
                Explore {allOrgs.length} participating organizations and their tech stacks
                {cacheInfo?.cached && cacheInfo.expiresAt && (
                  <span className="ml-2 text-xs">
                    • Cached until {new Date(cacheInfo.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, technology, or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-secondary pl-10 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">
                  All ({allOrgs.length})
                </SelectItem>
                {categories.slice(1).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat} ({categoryCounts[cat] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="tech-count">Most Technologies</SelectItem>
                <SelectItem value="popularity">Most Popular</SelectItem>
                <SelectItem value="beginner-friendly">Beginner Friendly</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="w-full sm:w-auto"
            >
              <Filter className="mr-2 h-4 w-4" />
              {showAdvancedFilters ? "Hide" : "Show"} Advanced
            </Button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <Card className="border-border bg-card">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Number of Technologies: {minTechCount} - {maxTechCount === 100 ? "All" : maxTechCount}
                    </Label>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Min</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={minTechCount}
                          onChange={(e) => setMinTechCount(parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Max</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={maxTechCount}
                          onChange={(e) => setMaxTechCount(parseInt(e.target.value) || 100)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMinTechCount(0)
                        setMaxTechCount(100)
                        setSelectedCategory("All")
                        setSearchQuery("")
                        setSortBy("name")
                      }}
                    >
                      Reset Filters
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMinTechCount(1)
                        setMaxTechCount(5)
                        setSortBy("beginner-friendly")
                      }}
                    >
                      Beginner Friendly
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMinTechCount(5)
                        setMaxTechCount(100)
                        setSortBy("tech-count")
                      }}
                    >
                      Tech Diverse
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          {loading ? (
            "Loading organizations..."
          ) : (
            <>
              Showing {filteredOrgs.length} organization{filteredOrgs.length !== 1 ? "s" : ""}
            </>
          )}
        </div>

        {/* Organizations table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading GSoC organizations...</p>
            </div>
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              No organizations found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Organization
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Technologies
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Topics
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Links
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrgs.map((org, index) => (
                    <tr
                      key={`${org.name}-${index}`}
                      className="hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-foreground">{org.name}</div>
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {org.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="whitespace-nowrap">
                          {org.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {org.technologies.slice(0, 4).map((tech, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="bg-primary/10 text-primary text-xs"
                            >
                              {tech}
                            </Badge>
                          ))}
                          {org.technologies.length > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{org.technologies.length - 4}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {org.topics.slice(0, 3).map((topic, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                          {org.topics.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{org.topics.length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          {org.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-8 px-2"
                            >
                              <a
                                href={org.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Website"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          )}
                          {org.ideas_list && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-8 px-2"
                            >
                              <a
                                href={org.ideas_list}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Project Ideas"
                              >
                                <Calendar className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
