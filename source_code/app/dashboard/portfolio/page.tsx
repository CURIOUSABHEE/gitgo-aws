"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Copy, Check, Loader2, Globe, Eye } from "lucide-react"
import toast from "react-hot-toast"

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [username, setUsername] = useState("")
  const [theme, setTheme] = useState("minimal")
  const [sections, setSections] = useState({
    about: true,
    skills: true,
    projects: true,
    experience: true,
    education: true,
    contributions: true,
  })
  const [isPublished, setIsPublished] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchPortfolio()
  }, [])

  const fetchPortfolio = async () => {
    try {
      const response = await fetch("/api/portfolio")
      if (response.ok) {
        const data = await response.json()
        if (data.portfolio) {
          setPortfolio(data.portfolio)
          setUsername(data.portfolio.username)
          setTheme(data.portfolio.theme)
          setSections(data.portfolio.sections)
          setIsPublished(data.portfolio.isPublished)
        }
      }
    } catch (error) {
      console.error("Error fetching portfolio:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          theme,
          sections,
          isPublished,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPortfolio(data.portfolio)
        toast.success("Portfolio saved successfully!")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to save portfolio")
      }
    } catch (error) {
      toast.error("Failed to save portfolio")
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setIsPublished(true)
    setSaving(true)
    try {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          theme,
          sections,
          isPublished: true,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPortfolio(data.portfolio)
        toast.success(`Portfolio published at ${data.url}!`)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to publish portfolio")
        setIsPublished(false)
      }
    } catch (error) {
      toast.error("Failed to publish portfolio")
      setIsPublished(false)
    } finally {
      setSaving(false)
    }
  }

  const copyUrl = () => {
    const url = `https://${username}.gitgo.dev`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("URL copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePreview = () => {
    // Open portfolio preview in new tab
    const previewUrl = `/portfolio?username=${username}&theme=${theme}&preview=true`
    window.open(previewUrl, "_blank")
  }

  const portfolioUrl = `https://${username || "your-username"}.gitgo.dev`

  if (loading) {
    return (
      <div className="flex flex-col">
        <DashboardHeader title="Portfolio" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <DashboardHeader title="Portfolio" />

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {/* Header Card */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Your Portfolio Website</CardTitle>
                <CardDescription>
                  Create a beautiful portfolio in minutes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* URL Preview */}
        {isPublished && (
          <Card className="mb-6 border-green-500/20 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Your Portfolio URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm font-mono text-green-400">{portfolioUrl}</code>
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                      Live
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handlePreview}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button size="sm" variant="outline" onClick={copyUrl}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" asChild>
                    <a href={portfolioUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visit
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Username */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Portfolio URL</CardTitle>
            <CardDescription>
              Choose your unique subdomain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="your-username"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">.gitgo.dev</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Only lowercase letters, numbers, and hyphens allowed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Portfolio Sections</CardTitle>
            <CardDescription>
              Choose which sections to display
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(sections).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={key} className="capitalize cursor-pointer">
                  {key}
                </Label>
                <Switch
                  id={key}
                  checked={value}
                  onCheckedChange={(checked) =>
                    setSections({ ...sections, [key]: checked })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Theme */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Template</CardTitle>
            <CardDescription>
              Choose your portfolio template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["minimal", "creative", "professional", "student"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === t
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-sm font-medium capitalize">{t}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button 
            onClick={handlePreview} 
            disabled={!username} 
            variant="outline" 
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={saving} variant="outline" className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
          <Button
            onClick={handlePublish}
            disabled={saving || !username}
            className="flex-1"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isPublished ? "Update Portfolio" : "Publish Portfolio"}
          </Button>
        </div>
      </div>
    </div>
  )
}
