"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { PortfolioControls } from "@/components/portfolio/portfolio-controls"
import { PortfolioEditorPanel } from "@/components/portfolio/portfolio-editor-panel"
import { SchemaRenderer } from "@/components/portfolio/schema-renderer"
import { CodeEditorModal } from "@/components/portfolio/code-editor-modal"
import { useGitHub } from "@/hooks/use-github"
import { useToast } from "@/hooks/use-toast"
import { colorThemes, type ColorTheme, type TemplateType } from "@/lib/portfolio-templates"
import { PortfolioSection } from "@/lib/portfolio-schema"
import { generatePortfolioHTML, downloadPortfolioHTML } from "@/lib/portfolio-export"
import { Loader2, Code2, Settings, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PortfolioPage() {
  const { profile, loading: profileLoading } = useGitHub()
  const { toast } = useToast()
  
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("minimal")
  const [selectedTheme, setSelectedTheme] = useState<ColorTheme>("midnight")
  const [sections, setSections] = useState<PortfolioSection[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showCodeEditor, setShowCodeEditor] = useState(false)
  const [generatedHTML, setGeneratedHTML] = useState("")

  // Load existing portfolio
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const response = await fetch("/api/portfolio")
        if (response.ok) {
          const data = await response.json()
          if (data.portfolio) {
            setSelectedTemplate(data.portfolio.templateId)
            setSelectedTheme(data.portfolio.theme)
            setSections(data.portfolio.sections)
          }
        }
      } catch (error) {
        console.error("Failed to load portfolio:", error)
      } finally {
        setLoading(false)
      }
    }

    loadPortfolio()
  }, [])

  const handleGenerate = async () => {
    if (!profile) {
      toast({
        title: "No GitHub data",
        description: "Please sync your GitHub account first",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)
    try {
      // Fetch technology map
      const techResponse = await fetch("/api/github/technology-map")
      const techData = techResponse.ok ? await techResponse.json() : null

      // Generate portfolio
      const response = await fetch("/api/portfolio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate,
          githubData: profile,
          techMap: techData,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate portfolio")
      }

      const data = await response.json()
      setSections(data.portfolio.sections)
      setSelectedTheme(data.portfolio.theme)

      toast({
        title: "Portfolio generated",
        description: "Your portfolio has been created from your GitHub data",
      })
    } catch (error) {
      console.error("Error generating portfolio:", error)
      toast({
        title: "Generation failed",
        description: "Failed to generate portfolio. Please try again.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    try {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate,
          theme: selectedTheme,
          sections,
          metadata: {
            title: `${profile?.user.name || "My"} Portfolio`,
            description: profile?.user.bio || "Developer Portfolio",
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save portfolio")
      }

      toast({
        title: "Portfolio saved",
        description: "Your changes have been saved successfully",
      })
    } catch (error) {
      console.error("Error saving portfolio:", error)
      toast({
        title: "Save failed",
        description: "Failed to save portfolio. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSectionUpdate = (sectionId: string, data: any) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, data } : section
      )
    )
  }

  const handleTemplateChange = async (template: TemplateType) => {
    setSelectedTemplate(template)
    // Regenerate with new template
    if (sections.length > 0) {
      await handleGenerate()
    }
  }

  const handleExport = () => {
    try {
      // Add avatar URL to hero section if it exists
      const sectionsWithAvatar = sections.map((section) => {
        if (section.type === "hero" && profile?.user.avatar_url) {
          return {
            ...section,
            data: {
              ...section.data,
              avatarUrl: profile.user.avatar_url,
            },
          }
        }
        return section
      })

      const html = generatePortfolioHTML(
        sectionsWithAvatar,
        colorThemes[selectedTheme],
        {
          title: `${profile?.user.name || "My"} Portfolio`,
          description: profile?.user.bio || "Developer Portfolio",
        }
      )

      setGeneratedHTML(html)
      setShowCodeEditor(true)
    } catch (error) {
      console.error("Error exporting portfolio:", error)
      toast({
        title: "Export failed",
        description: "Failed to export portfolio. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDownloadHTML = () => {
    try {
      downloadPortfolioHTML(generatedHTML, `${profile?.user.login || "portfolio"}.html`)
      toast({
        title: "Portfolio exported",
        description: "Your portfolio HTML has been downloaded. You can now customize it freely!",
      })
    } catch (error) {
      console.error("Error downloading portfolio:", error)
      toast({
        title: "Download failed",
        description: "Failed to download portfolio. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <DashboardHeader title="Portfolio Builder" />

      <div className="flex flex-1 overflow-hidden">
        {/* Main preview area */}
        <div className="flex-1 overflow-auto bg-background p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {sections.length > 0 ? "Your Portfolio" : "Generate Your Portfolio"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {sections.length > 0
                    ? "Click on any text to edit. Changes are saved automatically."
                    : "Select a template and click 'Generate from GitHub' to create your portfolio"}
                </p>
              </div>
              {sections.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="gap-2"
                >
                  <Code2 className="h-4 w-4" />
                  View Code
                </Button>
              )}
            </div>
          </div>

          {sections.length > 0 ? (
            <div className="mx-auto max-w-6xl rounded-xl border border-border bg-card overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-border bg-secondary px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/50" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                  <div className="h-3 w-3 rounded-full bg-primary/50" />
                </div>
                <div className="mx-auto flex items-center gap-2 rounded-md bg-background px-4 py-1 text-xs text-muted-foreground">
                  <span>{profile?.user.blog || `${profile?.user.login}.dev`}</span>
                </div>
              </div>

              {/* Portfolio content */}
              <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 250px)" }}>
                <SchemaRenderer
                  sections={sections}
                  theme={colorThemes[selectedTheme]}
                  templateId={selectedTemplate}
                  editable={true}
                  onSectionUpdate={handleSectionUpdate}
                />
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl items-center justify-center rounded-xl border border-border bg-card p-12">
              <div className="text-center">
                <p className="mb-4 text-muted-foreground">
                  No portfolio generated yet. Select a template and generate your portfolio from GitHub data.
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate from GitHub"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar controls */}
        <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-card">
          <Tabs defaultValue="settings" className="flex h-full flex-col">
            <div className="border-b border-border px-5 py-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="settings" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="editor" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Editor
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="settings" className="flex-1 overflow-auto p-5 m-0">
              <PortfolioControls
                selectedTemplate={selectedTemplate}
                selectedTheme={selectedTheme}
                onTemplateChange={handleTemplateChange}
                onThemeChange={setSelectedTheme}
                onGenerate={handleGenerate}
                onSave={handleSave}
                onExport={handleExport}
                generating={generating}
              />
            </TabsContent>

            <TabsContent value="editor" className="flex-1 overflow-auto p-5 m-0">
              <PortfolioEditorPanel
                sections={sections}
                onSectionsChange={setSections}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Code Editor Modal */}
      <CodeEditorModal
        open={showCodeEditor}
        onOpenChange={setShowCodeEditor}
        html={generatedHTML}
        onDownload={handleDownloadHTML}
      />
    </div>
  )
}
