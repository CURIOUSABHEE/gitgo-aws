"use client"

import { PortfolioSection } from "@/lib/portfolio-schema"
import { PortfolioTheme } from "@/lib/portfolio-templates"
import { HeroSection } from "./sections/hero-section"
import { AboutSection } from "./sections/about-section"
import { SkillsSection } from "./sections/skills-section"
import { ProjectsSection } from "./sections/projects-section"
import { StatsSection } from "./sections/stats-section"
import { ContactSection } from "./sections/contact-section"

interface SchemaRendererProps {
  sections: PortfolioSection[]
  theme: PortfolioTheme
  templateId: string
  editable?: boolean
  onSectionUpdate?: (sectionId: string, data: any) => void
  onSectionReorder?: (sections: PortfolioSection[]) => void
}

export function SchemaRenderer({
  sections,
  theme,
  templateId,
  editable = false,
  onSectionUpdate,
  onSectionReorder,
}: SchemaRendererProps) {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order)

  const renderSection = (section: PortfolioSection) => {
    if (!section.visible) return null

    const commonProps = {
      data: section.data,
      theme,
      templateId,
      editable,
      onUpdate: (data: any) => onSectionUpdate?.(section.id, data),
    }

    switch (section.type) {
      case "hero":
        return <HeroSection key={section.id} {...commonProps} />
      case "about":
        return <AboutSection key={section.id} {...commonProps} />
      case "skills":
        return <SkillsSection key={section.id} {...commonProps} />
      case "projects":
        return <ProjectsSection key={section.id} {...commonProps} />
      case "stats":
        return <StatsSection key={section.id} {...commonProps} />
      case "contact":
        return <ContactSection key={section.id} {...commonProps} />
      default:
        return null
    }
  }

  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: theme.colors.background,
        color: theme.colors.text 
      }}
    >
      {sortedSections.map(renderSection)}
    </div>
  )
}
