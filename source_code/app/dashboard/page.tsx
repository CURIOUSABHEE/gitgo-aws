"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { RepoCard } from "@/components/dashboard/repo-card"
import { RepoDetailsModal } from "@/components/dashboard/repo-details-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles } from "lucide-react"

function DashboardContent() {
  const searchParams = useSearchParams()
  const filter = searchParams?.get("filter")
  const [userSkills, setUserSkills] = useState<string[]>([])
  const [repos, setRepos] = useState<any[]>([])
  const [filteredRepos, setFilteredRepos] = useState<any[]>([])
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; repo: string } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const handleRepoClick = (owner: string, repo: string) => {
    setSelectedRepo({ owner, repo })
    setModalOpen(true)
  }

  // Fetch real repos based on user's tech stack
  useEffect(() => {
    const fetchRepos = async () => {
      setLoading(true)
      try {
        console.log('[Dashboard] Fetching personalized repos...')
        const response = await fetch('/api/github/discover-repos')
        
        if (response.ok) {
          const data = await response.json()
          console.log(`[Dashboard] Fetched ${data.repos.length} repos`)
          setRepos(data.repos)
          setFilteredRepos(data.repos)
          setUserSkills(data.languages || [])
          
          // Fetch good first issue counts for each repo
          fetchGoodFirstIssueCounts(data.repos)
        } else {
          console.error('[Dashboard] Failed to fetch repos:', response.status)
        }
      } catch (error) {
        console.error('[Dashboard] Error fetching repos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRepos()
  }, [])

  // Fetch real good first issue counts
  const fetchGoodFirstIssueCounts = async (reposList: any[]) => {
    try {
      const updatedRepos = await Promise.all(
        reposList.map(async (repo) => {
          try {
            const response = await fetch(
              `/api/github/good-first-issues?owner=${repo.owner}&repo=${repo.name}`
            )
            
            if (response.ok) {
              const data = await response.json()
              console.log(`[Dashboard] ${repo.owner}/${repo.name}: ${data.count} good first issues`)
              return { ...repo, goodFirstIssues: data.count }
            }
            return { ...repo, goodFirstIssues: 0 }
          } catch (error) {
            console.error(`[Dashboard] Error fetching count for ${repo.owner}/${repo.name}:`, error)
            return { ...repo, goodFirstIssues: 0 }
          }
        })
      )
      
      console.log('[Dashboard] All counts fetched')
      setRepos(updatedRepos)
      setFilteredRepos(updatedRepos)
    } catch (error) {
      console.error('[Dashboard] Error in fetchGoodFirstIssueCounts:', error)
    }
  }

  // Apply filter based on query parameter
  useEffect(() => {
    if (filter === "trending") {
      const sorted = [...repos].sort((a, b) => b.stars - a.stars)
      setFilteredRepos(sorted)
    } else if (filter === "beginner") {
      const sorted = [...repos].sort((a, b) => (b.goodFirstIssues || 0) - (a.goodFirstIssues || 0))
      setFilteredRepos(sorted)
    } else {
      const sorted = [...repos].sort((a, b) => (b.goodFirstIssues || 0) - (a.goodFirstIssues || 0))
      setFilteredRepos(sorted)
    }
  }, [filter, repos])

  return (
    <div className="flex flex-col">
      <DashboardHeader title="Dashboard" />

      <div className="flex-1 p-6">
        {/* Welcome banner */}
        <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {filter === "trending"
                  ? "Trending Projects"
                  : filter === "beginner"
                  ? "Best for Beginners"
                  : "Personalized for Your Tech Stack"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {filter === "trending"
                  ? "Most popular open source projects"
                  : filter === "beginner"
                  ? `Showing ${filteredRepos.length} projects with the most beginner-friendly issues`
                  : `Showing ${filteredRepos.length} projects matching ${userSkills.join(", ")}`}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Finding projects matching your tech stack...</p>
            </div>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No projects found. Try adjusting your filters.</p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-6 bg-secondary">
              <TabsTrigger value="all">All Matches ({filteredRepos.length})</TabsTrigger>
              <TabsTrigger value="beginner">
                Beginner Friendly ({filteredRepos.filter(r => (r.goodFirstIssues || 0) > 0).length})
              </TabsTrigger>
              <TabsTrigger value="active">Most Active</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="grid gap-4 lg:grid-cols-2">
                {[...filteredRepos]
                  .sort((a, b) => (b.goodFirstIssues || 0) - (a.goodFirstIssues || 0))
                  .map((repo) => (
                    <RepoCard 
                      key={`${repo.owner}/${repo.name}`} 
                      name={repo.name}
                      owner={repo.owner}
                      description={repo.description}
                      language={repo.language}
                      languageColor={repo.languageColor}
                      tags={repo.topics?.slice(0, 4) || []}
                      goodFirstIssues={repo.goodFirstIssues}
                      homepage={repo.homepage}
                      onCardClick={handleRepoClick}
                    />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="beginner">
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredRepos
                  .filter((r) => (r.goodFirstIssues || 0) > 0)
                  .sort((a, b) => (b.goodFirstIssues || 0) - (a.goodFirstIssues || 0))
                  .map((repo) => (
                    <RepoCard 
                      key={`${repo.owner}/${repo.name}`} 
                      name={repo.name}
                      owner={repo.owner}
                      description={repo.description}
                      language={repo.language}
                      languageColor={repo.languageColor}
                      tags={repo.topics?.slice(0, 4) || []}
                      goodFirstIssues={repo.goodFirstIssues}
                      homepage={repo.homepage}
                      onCardClick={handleRepoClick}
                    />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="active">
              <div className="grid gap-4 lg:grid-cols-2">
                {[...filteredRepos]
                  .sort((a, b) => b.openIssues - a.openIssues)
                  .map((repo) => (
                    <RepoCard 
                      key={`${repo.owner}/${repo.name}`} 
                      name={repo.name}
                      owner={repo.owner}
                      description={repo.description}
                      language={repo.language}
                      languageColor={repo.languageColor}
                      tags={repo.topics?.slice(0, 4) || []}
                      goodFirstIssues={repo.goodFirstIssues}
                      homepage={repo.homepage}
                      onCardClick={handleRepoClick}
                    />
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col">
        <DashboardHeader title="Dashboard" />
        <div className="flex-1 p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
