"use client"

import { PortfolioTheme } from "@/lib/portfolio-templates"
import { EditableText } from "../editable-text"

interface SkillsSectionProps {
  data: {
    heading: string
    layout: "grid" | "list" | "tags"
    skills: Array<{
      name: string
      level?: number
      projects?: number
    }>
  }
  theme: PortfolioTheme
  templateId: string
  editable?: boolean
  onUpdate?: (data: any) => void
}

export function SkillsSection({ data, theme, templateId, editable, onUpdate }: SkillsSectionProps) {
  const { colors } = theme

  const handleUpdate = (field: string, value: string) => {
    onUpdate?.({ ...data, [field]: value })
  }

  // Template-specific styles
  const getTemplateStyles = () => {
    switch (templateId) {
      case "minimal":
        return {
          padding: "px-8 py-12",
          maxWidth: "max-w-3xl",
          headingSize: "text-2xl",
          headingWeight: "font-light",
          layout: "flex-col gap-2",
          skillStyle: "text-base border-b pb-2",
        }
      case "creative":
        return {
          padding: "px-8 py-20",
          maxWidth: "max-w-6xl",
          headingSize: "text-4xl",
          headingWeight: "font-extrabold",
          layout: "flex-wrap gap-4",
          skillStyle: "text-lg px-6 py-3 rounded-full",
        }
      case "professional":
        return {
          padding: "px-8 py-12",
          maxWidth: "max-w-5xl",
          headingSize: "text-3xl",
          headingWeight: "font-semibold",
          layout: "grid grid-cols-2 md:grid-cols-3 gap-4",
          skillStyle: "text-sm px-4 py-2 rounded-md text-center",
        }
      case "student":
        return {
          padding: "px-8 py-12",
          maxWidth: "max-w-5xl",
          headingSize: "text-3xl",
          headingWeight: "font-bold",
          layout: "flex-wrap gap-3",
          skillStyle: "text-base px-5 py-2.5 rounded-full",
        }
      default:
        return {
          padding: "px-8 py-12",
          maxWidth: "max-w-4xl",
          headingSize: "text-3xl",
          headingWeight: "font-bold",
          layout: "flex-wrap gap-3",
          skillStyle: "px-5 py-2.5 rounded-full",
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
          placeholder="Skills & Technologies"
        />

        <div className={`flex ${styles.layout}`}>
          {data.skills.map((skill, index) => (
            <div
              key={index}
              className={`group relative cursor-pointer font-medium transition-all hover:scale-105 ${styles.skillStyle}`}
              style={{
                background: templateId === "minimal" ? "transparent" : `${colors.primary}20`,
                color: colors.primary,
                border: templateId === "minimal" ? `1px solid ${colors.border}` : `1px solid ${colors.primary}40`,
                borderBottom: templateId === "minimal" ? `2px solid ${colors.primary}` : undefined,
              }}
            >
              <span>{skill.name}</span>
              {skill.projects && templateId !== "minimal" && (
                <span
                  className="ml-2 text-xs"
                  style={{ color: colors.textMuted }}
                >
                  ({skill.projects})
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
