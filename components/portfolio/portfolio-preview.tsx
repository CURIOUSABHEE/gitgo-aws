"use client"

import { useState, useEffect } from "react"
import { useGitHub } from "@/hooks/use-github"
import { Loader2 } from "lucide-react"
import { colorThemes, type ColorTheme, type TemplateType } from "@/lib/portfolio-templates"
import { ModernTemplate } from "./templates/modern-template"
import { MinimalTemplate } from "./templates/minimal-template"
import { CreativeTemplate } from "./templates/creative-template"
import { ProfessionalTemplate } from "./templates/professional-template"

interface PortfolioPreviewProps {
  selectedTemplate: TemplateType
  selectedTheme: ColorTheme
}

export function PortfolioPreview({ selectedTemplate, selectedTheme }: PortfolioPreviewProps) {
  const { profile, loading } = useGitHub()
  const [technologies, setTechnologies] = useState<any>(null)
  const [techLoading, setTechLoading] = useState(true)

  // Fetch technology map for skills
  useEffect(() => {
    const fetchTechMap = async () => {
      try {
        const response = await fetch("/api/github/technology-map")
        if (response.ok) {
          const data = await response.json()
          setTechnologies(data)
        }
      } catch (error) {
        console.error("Failed to fetch technology map:", error)
      } finally {
        setTechLoading(false)
      }
    }

    fetchTechMap()
  }, [])

  if (loading || techLoading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center rounded-xl border border-border bg-card p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">No GitHub data available. Please sync your account.</p>
      </div>
    )
  }

  const theme = colorThemes[selectedTheme]
  const templateProps = { profile, technologies, theme }

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-border bg-card overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-secondary px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-destructive/50" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
          <div className="h-3 w-3 rounded-full bg-primary/50" />
        </div>
        <div className="mx-auto flex items-center gap-2 rounded-md bg-background px-4 py-1 text-xs text-muted-foreground">
          <span>{profile.user.blog || `${profile.user.login}.dev`}</span>
        </div>
      </div>

      {/* Template content */}
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {selectedTemplate === "modern" && <ModernTemplate {...templateProps} />}
        {selectedTemplate === "minimal" && <MinimalTemplate {...templateProps} />}
        {selectedTemplate === "creative" && <CreativeTemplate {...templateProps} />}
        {selectedTemplate === "professional" && <ProfessionalTemplate {...templateProps} />}
      </div>
    </div>
  )
}
