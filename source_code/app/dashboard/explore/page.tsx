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
    language: "JavaScript",
    languageColor: "#f1e05a",
    tags: ["React", "JavaScript", "UI", "Frontend"],
    homepage: "https://react.dev",
  },
  {
    name: "deno",
    owner: "denoland",
    description:
      "A modern runtime for JavaScript and TypeScript built on V8, Rust, and Tokio.",
    language: "Rust",
    languageColor: "#dea584",
    tags: ["TypeScript", "Rust", "Runtime"],
    homepage: "https://deno.com",
  },
  {
    name: "shadcn-ui",
    owner: "shadcn-ui",
    description:
      "Beautifully designed components built with Radix UI and Tailwind CSS. Copy and paste into your apps.",
    language: "TypeScript",
    languageColor: "#3178c6",
    tags: ["React", "TypeScript", "UI", "Components"],
    homepage: "https://ui.shadcn.com",
  },
  {
    name: "tensorflow",
    owner: "tensorflow",
    description:
      "An open source machine learning framework for everyone. Build and deploy ML powered applications.",
    language: "Python",
    languageColor: "#3572A5",
    tags: ["Python", "AI", "ML", "Deep Learning"],
    homepage: "https://www.tensorflow.org",
  },
  {
    name: "prisma",
    owner: "prisma",
    description:
      "Next-generation ORM for Node.js and TypeScript. Intuitive data model, automated migrations, type-safety.",
    language: "TypeScript",
    languageColor: "#3178c6",
    tags: ["TypeScript", "Node.js", "Database", "ORM"],
    homepage: "https://www.prisma.io",
  },
  {
    name: "flutter",
    owner: "flutter",
    description:
      "Flutter makes it easy and fast to build beautiful apps for mobile and beyond.",
    language: "Dart",
    languageColor: "#00B4AB",
    tags: ["Dart", "Mobile", "UI", "Cross-platform"],
    homepage: "https://flutter.dev",
  },
  {
    name: "astro",
    owner: "withastro",
    description:
      "The web framework for content-driven websites. Astro powers the world's fastest websites and apps.",
    language: "TypeScript",
    languageColor: "#3178c6",
    tags: ["TypeScript", "Frontend", "SSG", "Framework"],
    homepage: "https://astro.build",
  },
  {
    name: "huggingface_hub",
    owner: "huggingface",
    description:
      "The official Python client for the Hugging Face Hub. Download and publish models, datasets and more.",
    language: "Python",
    languageColor: "#3572A5",
    tags: ["Python", "AI", "ML", "NLP"],
    homepage: "https://huggingface.co",
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
                Discover popular repositories with good first issues
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
        <div className="grid gap-6 lg:grid-cols-2">
          {[...reposWithCounts]
            .sort((a, b) => (b.goodFirstIssues || 0) - (a.goodFirstIssues || 0))
            .map((repo) => (
              <RepoCard 
                key={`${repo.owner}/${repo.name}`} 
                name={repo.name}
                owner={repo.owner}
                description={repo.description}
                language={repo.language}
                languageColor={repo.languageColor}
                tags={repo.tags}
                goodFirstIssues={repo.goodFirstIssues}
                homepage={repo.homepage}
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
