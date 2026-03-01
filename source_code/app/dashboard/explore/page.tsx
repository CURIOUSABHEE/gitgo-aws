"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { RepoCard } from "@/components/dashboard/repo-card"
import { RepoDetailsModal } from "@/components/dashboard/repo-details-modal"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Compass, Search } from "lucide-react"

const categories = [
  "All",
  "Frontend",
  "Backend",
  "AI / ML",
  "DevTools",
  "Mobile",
  "Data",
]

const exploreRepos = [
  {
    name: "react",
    owner: "facebook",
    description:
      "The library for web and native user interfaces. React lets you build user interfaces out of individual pieces called components.",
    stars: 231000,
    forks: 47200,
    matchScore: 88,
    matchReason:
      "Core library for your React skills. Many good-first-issues available for documentation and testing.",
    language: "JavaScript",
    languageColor: "#f1e05a",
    tags: ["good-first-issue", "React", "JavaScript", "help-wanted"],
  },
  {
    name: "deno",
    owner: "denoland",
    description:
      "A modern runtime for JavaScript and TypeScript built on V8, Rust, and Tokio.",
    stars: 97000,
    forks: 5400,
    matchScore: 76,
    matchReason:
      "Aligns with your TypeScript experience. Great for learning runtime internals.",
    language: "Rust",
    languageColor: "#dea584",
    tags: ["TypeScript", "Rust", "runtime", "good-first-issue"],
  },
  {
    name: "shadcn-ui",
    owner: "shadcn-ui",
    description:
      "Beautifully designed components built with Radix UI and Tailwind CSS. Copy and paste into your apps.",
    stars: 76000,
    forks: 4800,
    matchScore: 95,
    matchReason:
      "Perfect match for your React and TypeScript skills. Component-focused contributions are great for portfolios.",
    language: "TypeScript",
    languageColor: "#3178c6",
    tags: ["React", "TypeScript", "UI", "beginner-friendly"],
  },
  {
    name: "tensorflow",
    owner: "tensorflow",
    description:
      "An open source machine learning framework for everyone. Build and deploy ML powered applications.",
    stars: 187000,
    forks: 74200,
    matchScore: 68,
    matchReason:
      "Matches your Python skill. Large community with extensive contributor documentation.",
    language: "Python",
    languageColor: "#3572A5",
    tags: ["Python", "AI", "ML", "documentation"],
  },
  {
    name: "prisma",
    owner: "prisma",
    description:
      "Next-generation ORM for Node.js and TypeScript. Intuitive data model, automated migrations, type-safety.",
    stars: 40000,
    forks: 1600,
    matchScore: 90,
    matchReason:
      "Matches your Node.js and TypeScript skills. Database-focused issues align with your PostgreSQL experience.",
    language: "TypeScript",
    languageColor: "#3178c6",
    tags: ["TypeScript", "Node.js", "PostgreSQL", "good-first-issue"],
  },
  {
    name: "flutter",
    owner: "flutter",
    description:
      "Flutter makes it easy and fast to build beautiful apps for mobile and beyond.",
    stars: 167000,
    forks: 27800,
    matchScore: 54,
    matchReason:
      "New technology area for you. Could broaden your skill set with mobile development.",
    language: "Dart",
    languageColor: "#00B4AB",
    tags: ["Dart", "mobile", "UI", "beginner-friendly"],
  },
  {
    name: "astro",
    owner: "withastro",
    description:
      "The web framework for content-driven websites. Astro powers the world's fastest websites and apps.",
    stars: 48000,
    forks: 2500,
    matchScore: 85,
    matchReason:
      "Aligns with your frontend and TypeScript skills. Active contributor community with mentoring.",
    language: "TypeScript",
    languageColor: "#3178c6",
    tags: ["TypeScript", "frontend", "SSG", "help-wanted"],
  },
  {
    name: "huggingface_hub",
    owner: "huggingface",
    description:
      "The official Python client for the Hugging Face Hub. Download and publish models, datasets and more.",
    stars: 21000,
    forks: 5200,
    matchScore: 72,
    matchReason:
      "Matches your Python skill. Growing AI ecosystem with welcoming community.",
    language: "Python",
    languageColor: "#3572A5",
    tags: ["Python", "AI", "ML", "good-first-issue"],
  },
]

export default function ExplorePage() {
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; repo: string } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [reposWithCounts, setReposWithCounts] = useState(exploreRepos)

  const handleRepoClick = (owner: string, repo: string) => {
    setSelectedRepo({ owner, repo })
    setModalOpen(true)
  }

  // Fetch real good first issue counts
  useEffect(() => {
    const fetchGoodFirstIssueCounts = async () => {
      console.log('[Explore] Fetching good first issue counts...')
      const updatedRepos = await Promise.all(
        exploreRepos.map(async (repo) => {
          try {
            const response = await fetch(
              `/api/github/good-first-issues?owner=${repo.owner}&repo=${repo.name}`
            )
            if (response.ok) {
              const data = await response.json()
              console.log(`[Explore] ${repo.owner}/${repo.name}: ${data.count} good first issues`)
              return { ...repo, goodFirstIssues: data.count }
            } else {
              console.error(`[Explore] Failed to fetch count for ${repo.owner}/${repo.name}: ${response.status}`)
            }
          } catch (error) {
            console.error(`[Explore] Error fetching count for ${repo.owner}/${repo.name}:`, error)
          }
          return repo
        })
      )
      console.log('[Explore] Updated repos with counts:', updatedRepos)
      setReposWithCounts(updatedRepos)
    }

    fetchGoodFirstIssueCounts()
  }, [])

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
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Explore Open Source
              </h2>
              <p className="text-sm text-muted-foreground">
                Discover repos across the ecosystem, ranked by your skill match
              </p>
            </div>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search repos, languages, or topics..."
            className="bg-secondary pl-10 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((cat, i) => (
            <Badge
              key={cat}
              variant={i === 0 ? "default" : "outline"}
              className={
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              }
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Repo grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {[...reposWithCounts]
            .sort((a, b) => (b.goodFirstIssues || 0) - (a.goodFirstIssues || 0))
            .map((repo) => (
              <RepoCard 
                key={`${repo.owner}/${repo.name}`} 
                {...repo} 
                onCardClick={handleRepoClick}
              />
            ))}
        </div>

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
