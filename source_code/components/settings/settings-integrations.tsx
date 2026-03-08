"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { signIn } from "next-auth/react"
import {
  RefreshCw,
  Loader2,
  CheckCircle2,
  ExternalLink,
  X,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useGitHub } from "@/hooks/use-github"
import toast from "react-hot-toast"

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

interface LinkedInData {
  url: string
  username?: string
  fetchedAt?: string
}

export function SettingsIntegrations() {
  const { data: session } = useSession()
  const { profile, loading, refreshProfile } = useGitHub()
  const [syncing, setSyncing] = useState(false)
  const [linkedinSyncing, setLinkedinSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string>("Never")
  const [linkedinConnected, setLinkedinConnected] = useState(false)
  const [linkedinLastSync, setLinkedinLastSync] = useState<string>("Never")

  // LinkedIn state
  const [linkedinData, setLinkedinData] = useState<LinkedInData | null>(null)
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [showLinkedinInput, setShowLinkedinInput] = useState(false)
  const [linkedinSaving, setLinkedinSaving] = useState(false)
  const [linkedinLoading, setLinkedinLoading] = useState(true)
  const [linkedinError, setLinkedinError] = useState<string | null>(null)
  const [linkedinDisconnecting, setLinkedinDisconnecting] = useState(false)

  // Fetch LinkedIn data on mount
  useEffect(() => {
    const fetchLinkedin = async () => {
      try {
        const res = await fetch("/api/user/linkedin")
        if (res.ok) {
          const json = await res.json()
          if (json.data?.url) {
            const urlObj = new URL(json.data.url)
            const username =
              urlObj.pathname.split("/in/")[1]?.replace(/\//g, "") || ""
            setLinkedinData({
              url: json.data.url,
              username,
              fetchedAt: json.data.fetchedAt,
            })
          }
        }
      } catch (err) {
        console.error("Failed to fetch LinkedIn data:", err)
      } finally {
        setLinkedinLoading(false)
      }
    }
    fetchLinkedin()
  }, [])

  useEffect(() => {
    if (profile) {
      setLastSyncTime(new Date().toLocaleString())
    }
  }, [profile])

  // Check if LinkedIn is connected
  useEffect(() => {
    const checkLinkedInConnection = async () => {
      try {
        const response = await fetch("/api/linkedin/status")
        if (response.ok) {
          const data = await response.json()
          setLinkedinConnected(data.connected)
          if (data.lastSynced) {
            setLinkedinLastSync(new Date(data.lastSynced).toLocaleString())
          }
        }
      } catch (error) {
        console.error("Failed to check LinkedIn status:", error)
      }
    }

    if (session) {
      checkLinkedInConnection()
    }
  }, [session])

  const handleResync = async () => {
    setSyncing(true)
    const toastId = toast.loading("Syncing GitHub data...")
    try {
      await refreshProfile()
      setLastSyncTime(new Date().toLocaleString())
      toast.success("GitHub data synced successfully!", { id: toastId })
    } catch (error) {
      console.error("Failed to resync:", error)
      toast.error("Failed to sync GitHub data", { id: toastId })
    } finally {
      setSyncing(false)
    }
  }

  const handleGitHubConnect = () => {
    signIn("github", { callbackUrl: "/dashboard/settings" })
  }

  const handleLinkedInConnect = () => {
    signIn("linkedin", { callbackUrl: "/dashboard/settings" })
  }

  const handleLinkedInSync = async () => {
    setLinkedinSyncing(true)
    const toastId = toast.loading("Syncing LinkedIn data...")
    try {
      const response = await fetch("/api/linkedin/sync", {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to sync LinkedIn data")
      }

      const data = await response.json()
      setLinkedinLastSync(new Date().toLocaleString())
      toast.success("LinkedIn data synced successfully!", { id: toastId })
    } catch (error) {
      console.error("Failed to sync LinkedIn:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to sync LinkedIn data",
        { id: toastId }
      )
    } finally {
      setLinkedinSyncing(false)
    }
  }

  const handleLinkedinSave = async () => {
    if (!linkedinUrl.trim()) {
      setLinkedinError("Please enter a LinkedIn URL")
      return
    }

    setLinkedinSaving(true)
    setLinkedinError(null)

    try {
      const res = await fetch("/api/user/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkedinUrl.trim() }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Failed to save")
      }

      const json = await res.json()
      setLinkedinData({
        url: json.data.url,
        username: json.data.username,
        fetchedAt: json.data.fetchedAt,
      })
      setShowLinkedinInput(false)
      setLinkedinUrl("")
    } catch (err) {
      setLinkedinError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setLinkedinSaving(false)
    }
  }

  const handleLinkedinDisconnect = async () => {
    setLinkedinDisconnecting(true)
    try {
      await fetch("/api/user/linkedin", { method: "DELETE" })
      setLinkedinData(null)
    } catch (err) {
      console.error("Failed to disconnect LinkedIn:", err)
    } finally {
      setLinkedinDisconnecting(false)
    }
  }

  if (loading || linkedinLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Integrations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your accounts to improve matching accuracy.
        </p>
      </div>

      <Separator className="my-6" />

      <div className="flex flex-col gap-4">
        {/* GitHub Integration */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-foreground">
              <GitHubIcon />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <p className="text-sm font-semibold text-foreground">GitHub</p>
                {session?.accessToken ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    Not connected
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Used to analyze your repositories and find matching open source
                projects.
              </p>
              {profile?.user.login && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Signed in as{" "}
                  <span className="font-medium text-foreground">
                    @{profile.user.login}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session?.accessToken ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleResync}
                disabled={syncing}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
                />
                {syncing ? "Syncing..." : "Re-sync Data"}
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={handleGitHubConnect}
              >
                Connect
              </Button>
            )}
          </div>
        </div>

        {/* LinkedIn Integration */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-foreground">
                <LinkedInIcon />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <p className="text-sm font-semibold text-foreground">
                    LinkedIn
                  </p>
                  {linkedinData ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                      Not connected
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Import your experience and skills to improve match accuracy.
                </p>
                {linkedinData?.username && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Linked as{" "}
                    <a
                      href={linkedinData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                    >
                      {linkedinData.username}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {linkedinData ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={handleLinkedinDisconnect}
                  disabled={linkedinDisconnecting}
                >
                  {linkedinDisconnecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowLinkedinInput(true)}
                >
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* LinkedIn URL input */}
          {showLinkedinInput && !linkedinData && (
            <div className="mt-4 border-t border-border pt-4">
              <label className="text-xs font-medium text-foreground">
                LinkedIn Profile URL
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => {
                    setLinkedinUrl(e.target.value)
                    setLinkedinError(null)
                  }}
                  placeholder="https://linkedin.com/in/your-profile"
                  className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLinkedinSave()
                  }}
                />
                <Button
                  size="sm"
                  className="h-9 text-xs"
                  onClick={handleLinkedinSave}
                  disabled={linkedinSaving}
                >
                  {linkedinSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => {
                    setShowLinkedinInput(false)
                    setLinkedinUrl("")
                    setLinkedinError(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
              {linkedinError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {linkedinError}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Paste your LinkedIn profile URL (e.g., linkedin.com/in/johndoe)
              </p>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {session?.accessToken
            ? `Last synced: ${lastSyncTime}. gitgo only reads public data and does not modify any of your accounts.`
            : "Connect your accounts to start syncing your data."}
        </p>
      </div>
    </div>
  )
}
