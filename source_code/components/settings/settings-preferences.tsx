"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useGitHub } from "@/hooks/use-github"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface PreferenceToggle {
  id: string
  label: string
  description: string
  defaultValue: boolean
}

const emailPrefs: PreferenceToggle[] = [
  {
    id: "email-matches",
    label: "New Match Alerts",
    description: "Get notified when new repositories match your profile.",
    defaultValue: true,
  },
  {
    id: "email-digest",
    label: "Weekly Digest",
    description: "A weekly summary of your top matches and community highlights.",
    defaultValue: true,
  },
  {
    id: "email-social",
    label: "Social Activity",
    description: "Likes, comments, and follows from other developers.",
    defaultValue: false,
  },
  {
    id: "email-pr-updates",
    label: "PR Updates",
    description: "Status updates on pull requests you're involved with.",
    defaultValue: true,
  },
]

const pushPrefs: PreferenceToggle[] = [
  {
    id: "push-matches",
    label: "High-Priority Matches",
    description: "Instant alerts for 90%+ match score repositories.",
    defaultValue: true,
  },
  {
    id: "push-mentions",
    label: "Mentions",
    description: "When someone mentions you in a post or comment.",
    defaultValue: true,
  },
  {
    id: "push-milestones",
    label: "Milestones",
    description: "Celebrate your achievements like first PR merged or badges earned.",
    defaultValue: true,
  },
]

export function SettingsPreferences() {
  const { profile } = useGitHub()
  const { toast } = useToast()
  const userEmail = profile?.user.email || "your.email@example.com"

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  
  const [emailPreferences, setEmailPreferences] = useState({
    newMatches: true,
    weeklyDigest: true,
    socialActivity: false,
    prUpdates: true,
  })

  const [pushPreferences, setPushPreferences] = useState({
    highPriorityMatches: true,
    mentions: true,
    milestones: true,
  })

  // Load preferences from database
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch("/api/user/preferences")
        if (response.ok) {
          const data = await response.json()
          if (data.preferences) {
            setEmailPreferences(data.preferences.emailNotifications)
            setPushPreferences(data.preferences.pushNotifications)
          }
        }
      } catch (error) {
        console.error("Failed to fetch preferences:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPreferences()
  }, [])

  const handleEmailChange = (key: string, value: boolean) => {
    setEmailPreferences(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handlePushChange = (key: string, value: boolean) => {
    setPushPreferences(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailNotifications: emailPreferences,
          pushNotifications: pushPreferences,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update preferences")
      }

      setHasChanges(false)
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      })
    } catch (error) {
      console.error("Error saving preferences:", error)
      toast({
        title: "Update failed",
        description: "Failed to save your preferences. Please try again.",
        variant: "destructive",
      })
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

  return (
    <div className="max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Control how and when gitgo sends you notifications.
        </p>
      </div>

      <Separator className="my-6" />

      {/* Email Notifications */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">Email Notifications</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Sent to {userEmail}
        </p>
        <div className="mt-3 flex flex-col divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <Label htmlFor="email-matches" className="text-sm font-medium text-foreground">
                New Match Alerts
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Get notified when new repositories match your profile.
              </p>
            </div>
            <Switch 
              id="email-matches" 
              checked={emailPreferences.newMatches} 
              onCheckedChange={(val) => handleEmailChange("newMatches", val)} 
            />
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <Label htmlFor="email-digest" className="text-sm font-medium text-foreground">
                Weekly Digest
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                A weekly summary of your top matches and community highlights.
              </p>
            </div>
            <Switch 
              id="email-digest" 
              checked={emailPreferences.weeklyDigest} 
              onCheckedChange={(val) => handleEmailChange("weeklyDigest", val)} 
            />
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <Label htmlFor="email-social" className="text-sm font-medium text-foreground">
                Social Activity
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Likes, comments, and follows from other developers.
              </p>
            </div>
            <Switch 
              id="email-social" 
              checked={emailPreferences.socialActivity} 
              onCheckedChange={(val) => handleEmailChange("socialActivity", val)} 
            />
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <Label htmlFor="email-pr" className="text-sm font-medium text-foreground">
                PR Updates
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Status updates on pull requests you're involved with.
              </p>
            </div>
            <Switch 
              id="email-pr" 
              checked={emailPreferences.prUpdates} 
              onCheckedChange={(val) => handleEmailChange("prUpdates", val)} 
            />
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Push Notifications */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">Push Notifications</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Delivered to your browser or mobile device
        </p>
        <div className="mt-3 flex flex-col divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <Label htmlFor="push-matches" className="text-sm font-medium text-foreground">
                High-Priority Matches
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Instant alerts for 90%+ match score repositories.
              </p>
            </div>
            <Switch 
              id="push-matches" 
              checked={pushPreferences.highPriorityMatches} 
              onCheckedChange={(val) => handlePushChange("highPriorityMatches", val)} 
            />
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <Label htmlFor="push-mentions" className="text-sm font-medium text-foreground">
                Mentions
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                When someone mentions you in a post or comment.
              </p>
            </div>
            <Switch 
              id="push-mentions" 
              checked={pushPreferences.mentions} 
              onCheckedChange={(val) => handlePushChange("mentions", val)} 
            />
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <Label htmlFor="push-milestones" className="text-sm font-medium text-foreground">
                Milestones
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Celebrate your achievements like first PR merged or badges earned.
              </p>
            </div>
            <Switch 
              id="push-milestones" 
              checked={pushPreferences.milestones} 
              onCheckedChange={(val) => handlePushChange("milestones", val)} 
            />
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="flex justify-end">
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
            "Save Preferences"
          )}
        </Button>
      </div>
    </div>
  )
}
