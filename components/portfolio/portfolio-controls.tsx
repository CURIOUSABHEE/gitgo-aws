"use client"

import { useState } from "react"
import {
  RefreshCw,
  Palette,
  Download,
  Rocket,
  Github,
  Layout,
  Type,
  Loader2,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useGitHub } from "@/hooks/use-github"
import { useToast } from "@/hooks/use-toast"
import { templates, colorThemes, type TemplateType, type ColorTheme } from "@/lib/portfolio-templates"

interface PortfolioControlsProps {
  selectedTemplate: TemplateType
  selectedTheme: ColorTheme
  onTemplateChange: (template: TemplateType) => void
  onThemeChange: (theme: ColorTheme) => void
  onGenerate?: () => void
  onSave?: () => void
  onExport?: () => void
  generating?: boolean
}

export function PortfolioControls({
  selectedTemplate,
  selectedTheme,
  onTemplateChange,
  onThemeChange,
  onGenerate,
  onSave,
  onExport,
  generating = false,
}: PortfolioControlsProps) {
  const { refreshProfile } = useGitHub()
  const { toast } = useToast()
  const [syncing, setSyncing] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deploying, setDeploying] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      await refreshProfile()
      toast({
        title: "Synced successfully",
        description: "Your portfolio has been updated with latest GitHub data",
      })
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Failed to sync GitHub data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      await refreshProfile()
      toast({
        title: "Portfolio regenerated",
        description: "Your portfolio has been regenerated from GitHub",
      })
    } catch (error) {
      toast({
        title: "Regeneration failed",
        description: "Failed to regenerate portfolio. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRegenerating(false)
    }
  }

  const handleExport = () => {
    setExporting(true)
    // This will be handled by the parent component
    setTimeout(() => {
      setExporting(false)
    }, 500)
  }

  const handleDeploy = () => {
    setDeploying(true)
    setTimeout(() => {
      toast({
        title: "Deployment started",
        description: "Your portfolio is being deployed. This may take a few minutes.",
      })
      setDeploying(false)
    }, 2000)
  }

  return (
    <>
      {/* Actions */}
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 border-border text-foreground"
          onClick={onGenerate}
          disabled={generating}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          )}
          {generating ? "Generating..." : "Generate from GitHub"}
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 border-border text-foreground"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Github className="h-4 w-4 text-muted-foreground" />
          )}
          {syncing ? "Syncing..." : "Sync Latest Activity"}
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 border-border text-foreground"
          onClick={onSave}
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          Save Changes
        </Button>
      </div>

      <Separator className="my-5" />

      {/* Template Selection */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Layout className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Template
          </span>
        </div>
        <div className="space-y-2">
          {Object.entries(templates).map(([key, template]) => (
            <button
              key={key}
              onClick={() => onTemplateChange(key as TemplateType)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                selectedTemplate === key
                  ? "border-primary/40 bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-border hover:bg-secondary"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{template.name}</div>
                  <div className="mt-0.5 text-xs opacity-70">{template.description}</div>
                </div>
                {selectedTemplate === key && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <Separator className="my-5" />

      {/* Theme Selection */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Color Theme
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(colorThemes).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => onThemeChange(key as ColorTheme)}
              className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors ${
                selectedTheme === key
                  ? "border-primary/40 bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-border hover:bg-secondary"
              }`}
            >
              <div 
                className="h-5 w-5 rounded-full border border-border" 
                style={{ background: theme.colors.primary }}
              />
              <span className="flex-1 text-left">{theme.name}</span>
              {selectedTheme === key && (
                <Check className="h-3 w-3 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      <Separator className="my-5" />

      {/* Bottom Actions */}
      <div className="space-y-2 pt-4">
        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-green"
          onClick={handleDeploy}
          disabled={deploying}
        >
          {deploying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Deploy Portfolio
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="w-full border-border text-foreground"
          onClick={onExport || handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export HTML
            </>
          )}
        </Button>
      </div>
    </>
  )
}
