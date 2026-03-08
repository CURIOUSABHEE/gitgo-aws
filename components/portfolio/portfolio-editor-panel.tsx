"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { PortfolioSection, SectionType, createDefaultSection } from "@/lib/portfolio-schema"
import { 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  GripVertical,
  ChevronUp,
  ChevronDown
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PortfolioEditorPanelProps {
  sections: PortfolioSection[]
  onSectionsChange: (sections: PortfolioSection[]) => void
}

const sectionTypes: { value: SectionType; label: string; description: string }[] = [
  { value: "hero", label: "Hero", description: "Main header with title and CTA" },
  { value: "about", label: "About", description: "About me section" },
  { value: "skills", label: "Skills", description: "Skills and technologies" },
  { value: "projects", label: "Projects", description: "Featured projects" },
  { value: "stats", label: "Stats", description: "GitHub statistics" },
  { value: "contact", label: "Contact", description: "Contact information" },
]

export function PortfolioEditorPanel({ sections, onSectionsChange }: PortfolioEditorPanelProps) {
  const [selectedSectionType, setSelectedSectionType] = useState<SectionType>("hero")

  const handleAddSection = () => {
    const newSection = createDefaultSection(selectedSectionType, sections.length)
    onSectionsChange([...sections, newSection])
  }

  const handleRemoveSection = (sectionId: string) => {
    onSectionsChange(sections.filter((s) => s.id !== sectionId))
  }

  const handleToggleVisibility = (sectionId: string) => {
    onSectionsChange(
      sections.map((s) =>
        s.id === sectionId ? { ...s, visible: !s.visible } : s
      )
    )
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newSections = [...sections]
    const temp = newSections[index]
    newSections[index] = { ...newSections[index - 1], order: index }
    newSections[index - 1] = { ...temp, order: index - 1 }
    onSectionsChange(newSections)
  }

  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return
    const newSections = [...sections]
    const temp = newSections[index]
    newSections[index] = { ...newSections[index + 1], order: index }
    newSections[index + 1] = { ...temp, order: index + 1 }
    onSectionsChange(newSections)
  }

  const sortedSections = [...sections].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Section</CardTitle>
          <CardDescription>Add a new section to your portfolio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Section Type</Label>
            <Select
              value={selectedSectionType}
              onValueChange={(value) => setSelectedSectionType(value as SectionType)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sectionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddSection} className="w-full" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sections ({sections.length})</CardTitle>
          <CardDescription>Manage your portfolio sections</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedSections.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No sections yet. Add one above.
            </p>
          ) : (
            sortedSections.map((section, index) => (
              <div
                key={section.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
              >
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === sections.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize truncate">
                      {section.type}
                    </span>
                    {!section.visible && (
                      <span className="text-xs text-muted-foreground">(Hidden)</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {sectionTypes.find((t) => t.value === section.type)?.description}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleToggleVisibility(section.id)}
                  >
                    {section.visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveSection(section.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
