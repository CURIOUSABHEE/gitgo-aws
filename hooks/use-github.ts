import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

interface GitHubProfile {
  user: {
    login: string
    name: string
    email: string
    avatar_url: string
    bio: string
    title: string
    public_repos: number
    followers: number
    following: number
    location: string
    blog: string
    company: string
    twitter_username: string
    hireable: boolean
    created_at: string
  }
  repos: Array<{
    id: number
    name: string
    full_name: string
    description?: string
    language: string
    stargazers_count: number
    forks_count: number
    html_url?: string
    updated_at: string
    topics?: string[]
    owner?: {
      login: string
      avatar_url: string
    }
  }>
  languages: string[]
  stats: {
    totalRepos: number
    totalStars: number
    totalForks: number
  }
}

export function useGitHub() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<GitHubProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.accessToken) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/github/profile")
        if (!response.ok) {
          throw new Error("Failed to fetch GitHub profile")
        }
        const data = await response.json()
        setProfile(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [session])

  const refreshProfile = async () => {
    if (!session?.accessToken) return

    setLoading(true)
    setError(null)

    try {
      // Fetch from database (not GitHub) to get the updated profile
      const response = await fetch("/api/github/profile")
      if (!response.ok) {
        throw new Error("Failed to refresh profile")
      }
      const data = await response.json()
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const syncFromGitHub = async () => {
    if (!session?.accessToken) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/github/sync", {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error("Failed to sync GitHub profile")
      }
      const data = await response.json()
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return { profile, loading, error, isAuthenticated: !!session, refreshProfile, syncFromGitHub }
}
