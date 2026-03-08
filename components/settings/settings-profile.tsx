"use client"

import { useEffect, useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useGitHub } from "@/hooks/use-github"
import toast from "react-hot-toast"

export function SettingsProfile() {
  const { profile, loading, refreshProfile } = useGitHub()
  const [saving, setSaving] = useState(false)
  
  // Local state for form fields
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    title: "",
    username: "",
    bio: "",
    email: "",
    location: "",
    website: "",
  })

  // Track if form has changes
  const [hasChanges, setHasChanges] = useState(false)

  // Populate form with GitHub data when available
  useEffect(() => {
    if (profile?.user) {
      const nameParts = profile.user.name?.split(" ") || []
      setFormData({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        title: profile.user.title || "",
        username: profile.user.login || "",
        bio: profile.user.bio || "",
        email: profile.user.email || "",
        location: profile.user.location || "",
        website: profile.user.blog || "",
      })
    }
  }, [profile])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim()
      
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email: formData.email,
          bio: formData.bio,
          title: formData.title,
          location: formData.location,
          blog: formData.website,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update profile")
      }

      const data = await response.json()
      
      // Refresh profile data from database (not GitHub)
      await refreshProfile()
      
      setHasChanges(false)
      toast.success("Profile updated successfully!")
    } catch (error) {
      console.error("Error saving profile:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to save your changes. Please try again."
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const initials = formData.firstName && formData.lastName
    ? `${formData.firstName[0]}${formData.lastName[0]}`
    : formData.username
    ? formData.username.slice(0, 2).toUpperCase()
    : "U"

  return (
    <div className="max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your public developer profile information.
        </p>
      </div>

      <Separator className="my-6" />

      {/* Avatar section */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <Avatar className="h-20 w-20">
            {profile?.user.avatar_url && (
              <AvatarImage src={profile.user.avatar_url} alt={formData.username} />
            )}
            <AvatarFallback className="bg-secondary text-lg font-semibold text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Camera className="h-3.5 w-3.5" />
            <span className="sr-only">Change avatar</span>
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Profile Photo</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {profile?.user.avatar_url ? "Synced from GitHub" : "JPG, PNG, or GIF. Max 2MB."}
          </p>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Form fields */}
      <div className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="firstName" className="text-sm text-foreground">
              First Name
            </Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              placeholder="Enter first name"
              className="border-border bg-background text-foreground"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lastName" className="text-sm text-foreground">
              Last Name
            </Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              placeholder="Enter last name"
              className="border-border bg-background text-foreground"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="username" className="text-sm text-foreground">
            GitHub Username
          </Label>
          <Input
            id="username"
            value={formData.username}
            disabled
            className="border-border bg-muted text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Your GitHub username cannot be changed here.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-sm text-foreground">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="your.email@example.com"
            className="border-border bg-background text-foreground"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="title" className="text-sm text-foreground">
            Title
          </Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="e.g., Full-Stack Developer"
            className="border-border bg-background text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Displayed on your portfolio and community profile.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="location" className="text-sm text-foreground">
            Location
          </Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => handleChange("location", e.target.value)}
            placeholder="e.g., San Francisco, CA"
            className="border-border bg-background text-foreground"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="website" className="text-sm text-foreground">
            Website
          </Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => handleChange("website", e.target.value)}
            placeholder="https://yourwebsite.com"
            className="border-border bg-background text-foreground"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bio" className="text-sm text-foreground">
            Bio
          </Label>
          <textarea
            id="bio"
            rows={3}
            value={formData.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            placeholder="Tell us about yourself..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <Separator className="my-6" />

      <div className="flex justify-end gap-3">
        {hasChanges && (
          <Button 
            variant="outline" 
            onClick={() => {
              // Reset to original values
              if (profile?.user) {
                const nameParts = profile.user.name?.split(" ") || []
                setFormData({
                  firstName: nameParts[0] || "",
                  lastName: nameParts.slice(1).join(" ") || "",
                  title: profile.user.title || "",
                  username: profile.user.login || "",
                  bio: profile.user.bio || "",
                  email: profile.user.email || "",
                  location: profile.user.location || "",
                  website: profile.user.blog || "",
                })
                setHasChanges(false)
              }
            }}
          >
            Cancel
          </Button>
        )}
        <Button 
          className="px-6" 
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  )
}
