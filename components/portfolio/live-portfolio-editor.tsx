"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Github, 
  Linkedin, 
  Twitter, 
  Globe, 
  Mail, 
  Star, 
  GitFork,
  Loader2,
  Save,
  Check,
  ExternalLink,
  Code
} from "lucide-react"
import toast from "react-hot-toast"
import { 
  type GitHubRepo, 
  type DualPortfolioData,
  getDualPortfolioData,
  savePortfolio 
} from "@/lib/portfolio-service"

interface PortfolioFormData {
  profile: {
    name: string
    bio: string
    tagline: string
    avatar?: string
    location?: string
    email?: string
  }
  socialLinks: {
    github?: string
    linkedin?: string
    twitter?: string
    website?: string
    email?: string
  }
  selectedRepos: Array<{
    repoId: number
    repoName: string
    repoFullName: string
  }>
  theme: string
  username: string
  subdomain: string
  isPublished: boolean
}

const defaultFormData: PortfolioFormData = {
  profile: {
    name: "",
    bio: "",
    tagline: "",
    location: "",
    email: "",
  },
  socialLinks: {
    github: "",
    linkedin: "",
    twitter: "",
    website: "",
    email: "",
  },
  selectedRepos: [],
  theme: "minimal",
  username: "",
  subdomain: "",
  isPublished: false,
}

export default function LivePortfolioEditor() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([])
  const [githubUser, setGithubUser] = useState<DualPortfolioData["githubUser"]>(null)
  const [formData, setFormData] = useState<PortfolioFormData>(defaultFormData)
  const [activeTab, setActiveTab] = useState("profile")

  useEffect(() => {
    if (session?.user?.githubId) {
      fetchPortfolioData()
    }
  }, [session])

  const fetchPortfolioData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/portfolio/live-editor")
      
      if (response.ok) {
        const data: DualPortfolioData = await response.json()
        
        if (data.githubRepos) {
          setGithubRepos(data.githubRepos)
        }
        if (data.githubUser) {
          setGithubUser(data.githubUser)
        }
        
        if (data.portfolio) {
          setFormData({
            profile: data.portfolio.profile || defaultFormData.profile,
            socialLinks: data.portfolio.socialLinks || defaultFormData.socialLinks,
            selectedRepos: data.portfolio.selectedRepos || [],
            theme: data.portfolio.theme || "minimal",
            username: data.portfolio.username || data.githubUser?.login || "",
            subdomain: data.portfolio.subdomain || data.githubUser?.login || "",
            isPublished: data.portfolio.isPublished || false,
          })
        } else if (data.githubUser) {
          // Pre-fill from GitHub
          setFormData(prev => ({
            ...prev,
            profile: {
              ...prev.profile,
              name: data.githubUser?.name || "",
              bio: data.githubUser?.bio || "",
              avatar: data.githubUser?.avatar_url,
              location: data.githubUser?.location || "",
            },
            socialLinks: {
              ...prev.socialLinks,
              github: data.githubUser?.login || "",
              website: data.githubUser?.blog || "",
              twitter: data.githubUser?.twitter_username || "",
            },
            username: data.githubUser?.login || "",
            subdomain: data.githubUser?.login || "",
          }))
        }
      }
    } catch (error) {
      console.error("Error fetching portfolio data:", error)
      toast.error("Failed to load portfolio data")
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
        body: JSON.stringify(formData),
      })

      if (response.ok) {
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

  const handleRepoToggle = (repo: GitHubRepo) => {
    setFormData(prev => {
      const isSelected = prev.selectedRepos.some(r => r.repoId === repo.id)
      
      if (isSelected) {
        return {
          ...prev,
          selectedRepos: prev.selectedRepos.filter(r => r.repoId !== repo.id)
        }
      } else {
        return {
          ...prev,
          selectedRepos: [
            ...prev.selectedRepos,
            {
              repoId: repo.id,
              repoName: repo.name,
              repoFullName: repo.full_name,
            }
          ]
        }
      }
    })
  }

  const updateProfile = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        [field]: value
      }
    }))
  }

  const updateSocial = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [field]: value
      }
    }))
  }

  const selectedReposData = useMemo(() => {
    return githubRepos.filter(repo => 
      formData.selectedRepos.some(sr => sr.repoId === repo.id)
    )
  }, [githubRepos, formData.selectedRepos])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Editor</h1>
          <p className="text-muted-foreground">Live preview as you edit</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Portfolio
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT SIDE - Editor */}
        <Card className="h-[calc(100vh-200px)]">
          <CardHeader>
            <CardTitle>Editor</CardTitle>
            <CardDescription>Edit your portfolio details</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="mx-4 w-full">
                <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
                <TabsTrigger value="repos" className="flex-1">Repositories</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
              </TabsList>
              
              <ScrollArea className="h-[calc(100%-120px)] px-6 pb-6">
                <TabsContent value="profile" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.profile.name}
                      onChange={(e) => updateProfile("name", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      placeholder="Full Stack Developer | Open Source Enthusiast"
                      value={formData.profile.tagline}
                      onChange={(e) => updateProfile("tagline", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us about yourself..."
                      value={formData.profile.bio}
                      onChange={(e) => updateProfile("bio", e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="San Francisco, CA"
                      value={formData.profile.location}
                      onChange={(e) => updateProfile("location", e.target.value)}
                    />
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <h3 className="font-semibold">Social Links</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="github">GitHub Username</Label>
                    <div className="flex items-center gap-2">
                      <Github className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="github"
                        placeholder="username"
                        value={formData.socialLinks.github}
                        onChange={(e) => updateSocial("github", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="linkedin"
                        placeholder="username"
                        value={formData.socialLinks.linkedin}
                        onChange={(e) => updateSocial("linkedin", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter</Label>
                    <div className="flex items-center gap-2">
                      <Twitter className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="twitter"
                        placeholder="username"
                        value={formData.socialLinks.twitter}
                        onChange={(e) => updateSocial("twitter", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="website"
                        placeholder="https://example.com"
                        value={formData.socialLinks.website}
                        onChange={(e) => updateSocial("website", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.socialLinks.email}
                        onChange={(e) => updateSocial("email", e.target.value)}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="repos" className="mt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Select up to 6 repositories to display in your portfolio
                  </p>
                  <div className="space-y-3">
                    {githubRepos.map(repo => {
                      const isSelected = formData.selectedRepos.some(r => r.repoId === repo.id)
                      return (
                        <div
                          key={repo.id}
                          className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                            isSelected 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Code className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate">{repo.name}</span>
                              {repo.language && (
                                <Badge variant="outline" className="text-xs">
                                  {repo.language}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {repo.description || "No description"}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {repo.stargazers_count}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <GitFork className="h-3 w-3" />
                                {repo.forks_count}
                              </span>
                            </div>
                          </div>
                          <Switch
                            checked={isSelected}
                            onCheckedChange={() => handleRepoToggle(repo)}
                            className="ml-4 flex-shrink-0"
                          />
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="johndoe"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your portfolio URL: gitgo.dev/{formData.username || "username"}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subdomain">Subdomain</Label>
                    <Input
                      id="subdomain"
                      placeholder="johndoe"
                      value={formData.subdomain}
                      onChange={(e) => setFormData(prev => ({ ...prev, subdomain: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Publish Portfolio</Label>
                      <p className="text-sm text-muted-foreground">
                        Make your portfolio publicly visible
                      </p>
                    </div>
                    <Switch
                      checked={formData.isPublished}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, isPublished: checked }))
                      }
                    />
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </CardContent>
        </Card>

        {/* RIGHT SIDE - Live Preview */}
        <Card className="h-[calc(100vh-200px)] overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Live Preview</CardTitle>
            <CardDescription>Real-time portfolio preview</CardDescription>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-80px)]">
            <ScrollArea className="h-full">
              <MinimalPortfolioPreview 
                profile={formData.profile}
                socialLinks={formData.socialLinks}
                repos={selectedReposData}
              />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Minimal Portfolio Template for Live Preview
function MinimalPortfolioPreview({ 
  profile, 
  socialLinks, 
  repos 
}: { 
  profile: PortfolioFormData["profile"]
  socialLinks: PortfolioFormData["socialLinks"]
  repos: GitHubRepo[]
}) {
  return (
    <div className="min-h-full bg-background p-8">
      {/* Header */}
      <header className="mx-auto max-w-3xl text-center mb-12">
        {profile.avatar ? (
          <img 
            src={profile.avatar} 
            alt={profile.name}
            className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-primary/20"
          />
        ) : (
          <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-primary/10 flex items-center justify-center">
            <span className="text-3xl font-bold text-primary">
              {profile.name?.charAt(0) || "?"}
            </span>
          </div>
        )}
        
        <h1 className="text-3xl font-bold mb-2">
          {profile.name || "Your Name"}
        </h1>
        
        {profile.tagline && (
          <p className="text-lg text-muted-foreground mb-4">
            {profile.tagline}
          </p>
        )}
        
        {profile.bio && (
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            {profile.bio}
          </p>
        )}
        
        {profile.location && (
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mb-4">
            <Globe className="h-4 w-4" />
            {profile.location}
          </p>
        )}
        
        {/* Social Links */}
        <div className="flex items-center justify-center gap-4">
          {socialLinks.github && (
            <a 
              href={`https://github.com/${socialLinks.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
          )}
          {socialLinks.linkedin && (
            <a 
              href={`https://linkedin.com/in/${socialLinks.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          )}
          {socialLinks.twitter && (
            <a 
              href={`https://twitter.com/${socialLinks.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Twitter className="h-5 w-5" />
            </a>
          )}
          {socialLinks.website && (
            <a 
              href={socialLinks.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Globe className="h-5 w-5" />
            </a>
          )}
          {socialLinks.email && (
            <a 
              href={`mailto:${socialLinks.email}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-5 w-5" />
            </a>
          )}
        </div>
      </header>

      {/* Top Projects */}
      {repos.length > 0 && (
        <section className="mx-auto max-w-3xl">
          <h2 className="text-xl font-semibold mb-6 text-center">Top Projects</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {repos.slice(0, 6).map(repo => (
              <a
                key={repo.id}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold truncate flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    {repo.name}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {repo.description || "No description"}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {repo.language}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {repo.stargazers_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="h-3 w-3" />
                    {repo.forks_count}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      {(socialLinks.email || socialLinks.github) && (
        <section className="mx-auto max-w-3xl mt-12 text-center">
          <h2 className="text-xl font-semibold mb-4">Get In Touch</h2>
          <p className="text-muted-foreground mb-6">
            Interested in working together? Let's connect!
          </p>
          <div className="flex items-center justify-center gap-4">
            {socialLinks.email && (
              <Button asChild>
                <a href={`mailto:${socialLinks.email}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email Me
                </a>
              </Button>
            )}
            {socialLinks.github && (
              <Button variant="outline" asChild>
                <a 
                  href={`https://github.com/${socialLinks.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="mr-2 h-4 w-4" />
                  Follow on GitHub
                </a>
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mx-auto max-w-3xl mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>Built with GitGo</p>
      </footer>
    </div>
  )
}
