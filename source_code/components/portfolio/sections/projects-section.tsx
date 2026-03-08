"use client"

import { Star, GitFork, ExternalLink, Code } from "lucide-react"
import { PortfolioTheme } from "@/lib/portfolio-templates"
import { EditableText } from "../editable-text"

interface ProjectsSectionProps {
  data: {
    heading: string
    layout: "grid" | "list" | "masonry"
    projects: Array<{
      id: number
      name: string
      description: string
      image?: string
      thumbnail?: string
      tags: string[]
      stars: number
      forks: number
      url: string
      demo?: string
      language?: string
      languageColor?: string
    }>
  }
  theme: PortfolioTheme
  templateId: string
  editable?: boolean
  onUpdate?: (data: any) => void
}

export function ProjectsSection({ data, theme, templateId, editable, onUpdate }: ProjectsSectionProps) {
  const { colors } = theme

  const handleUpdate = (field: string, value: string) => {
    onUpdate?.({ ...data, [field]: value })
  }

  // Template-specific styles
  const getTemplateStyles = () => {
    switch (templateId) {
      case "minimal":
        return {
          padding: "px-8 py-16",
          maxWidth: "max-w-4xl",
          gridCols: "md:grid-cols-1",
          headingSize: "text-2xl",
          headingWeight: "font-light",
          cardStyle: "border-l-4",
          showImage: false,
        }
      case "creative":
        return {
          padding: "px-8 py-24",
          maxWidth: "max-w-7xl",
          gridCols: "md:grid-cols-2 lg:grid-cols-3",
          headingSize: "text-4xl",
          headingWeight: "font-extrabold",
          cardStyle: "rounded-3xl",
          showImage: true,
        }
      case "professional":
        return {
          padding: "px-8 py-16",
          maxWidth: "max-w-6xl",
          gridCols: "md:grid-cols-2",
          headingSize: "text-3xl",
          headingWeight: "font-semibold",
          cardStyle: "rounded-lg",
          showImage: true,
        }
      case "student":
        return {
          padding: "px-8 py-16",
          maxWidth: "max-w-6xl",
          gridCols: "md:grid-cols-2 lg:grid-cols-3",
          headingSize: "text-3xl",
          headingWeight: "font-bold",
          cardStyle: "rounded-2xl",
          showImage: true,
        }
      default:
        return {
          padding: "px-8 py-12",
          maxWidth: "max-w-6xl",
          gridCols: "md:grid-cols-2 lg:grid-cols-3",
          headingSize: "text-3xl",
          headingWeight: "font-bold",
          cardStyle: "rounded-2xl",
          showImage: true,
        }
    }
  }

  const styles = getTemplateStyles()

  return (
    <section className={styles.padding}>
      <div className={`mx-auto ${styles.maxWidth}`}>
        <EditableText
          value={data.heading}
          onChange={(val) => handleUpdate("heading", val)}
          editable={editable}
          className={`mb-8 ${styles.headingSize} ${styles.headingWeight}`}
          style={{ color: colors.text }}
          placeholder="Featured Projects"
        />

        <div className={`grid gap-6 ${styles.gridCols}`}>
          {data.projects.map((project) => (
            <div
              key={project.id}
              className={`group overflow-hidden transition-all hover:scale-105 ${styles.cardStyle}`}
              style={{
                background: colors.surface,
                borderTop: `1px solid ${colors.border}`,
                borderRight: `1px solid ${colors.border}`,
                borderBottom: `1px solid ${colors.border}`,
                borderLeftColor: templateId === "minimal" ? colors.primary : colors.border,
                borderLeftWidth: templateId === "minimal" ? "4px" : "1px",
                borderLeftStyle: "solid",
              }}
            >
              {/* Project Thumbnail */}
              {styles.showImage && (
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
                  {project.image ? (
                    <img
                      src={project.image}
                      alt={project.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="text-center">
                        <Code className="mx-auto mb-2 h-12 w-12 opacity-50" style={{ color: colors.textMuted }} />
                        <p className="text-sm font-medium" style={{ color: colors.textMuted }}>
                          {project.name}
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Language badge */}
                  {project.language && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs backdrop-blur-sm">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: project.languageColor || "#8b949e" }}
                      />
                      <span className="text-white">{project.language}</span>
                    </div>
                  )}
                </div>
              )}

              <div className={templateId === "minimal" ? "p-4" : "p-6"}>
                <h3 
                  className={`mb-2 ${templateId === "creative" ? "text-2xl" : "text-xl"} font-bold`}
                  style={{ color: colors.text }}
                >
                  {project.name}
                </h3>
                <p 
                  className={`mb-4 text-sm ${styles.showImage ? "line-clamp-2" : ""}`}
                  style={{ color: colors.textMuted }}
                >
                  {project.description}
                </p>

                <div className="mb-4 flex flex-wrap gap-2">
                  {project.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className={`${templateId === "minimal" ? "text-xs px-2 py-0.5" : "px-3 py-1 text-xs"} rounded-full`}
                      style={{
                        background: `${colors.primary}15`,
                        color: colors.primary,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-sm" style={{ color: colors.textMuted }}>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      {project.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="h-4 w-4" />
                      {project.forks}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {project.demo && (
                      <a
                        href={project.demo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm transition-colors hover:opacity-80"
                        style={{ color: colors.primary }}
                        title="View live demo"
                      >
                        Demo
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm transition-colors hover:opacity-80"
                      style={{ color: colors.primary }}
                    >
                      Code
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
