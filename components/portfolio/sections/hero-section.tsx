"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PortfolioTheme } from "@/lib/portfolio-templates"
import { useGitHub } from "@/hooks/use-github"
import { EditableText } from "../editable-text"

interface HeroSectionProps {
  data: {
    title: string
    subtitle: string
    description: string
    ctaText?: string
    ctaLink?: string
    showAvatar?: boolean
  }
  theme: PortfolioTheme
  templateId: string
  editable?: boolean
  onUpdate?: (data: any) => void
}

export function HeroSection({ data, theme, templateId, editable, onUpdate }: HeroSectionProps) {
  const { profile } = useGitHub()
  const { colors } = theme

  const handleUpdate = (field: string, value: string) => {
    onUpdate?.({ ...data, [field]: value })
  }

  // Template-specific styles
  const getTemplateStyles = () => {
    switch (templateId) {
      case "minimal":
        return {
          padding: "py-24",
          titleSize: "text-4xl md:text-5xl",
          titleWeight: "font-light",
          subtitleSize: "text-lg",
          alignment: "text-left",
          maxWidth: "max-w-3xl",
          background: "transparent",
        }
      case "creative":
        return {
          padding: "py-32",
          titleSize: "text-5xl md:text-7xl",
          titleWeight: "font-extrabold",
          subtitleSize: "text-2xl",
          alignment: "text-center",
          maxWidth: "max-w-5xl",
          background: `linear-gradient(135deg, ${colors.primary}25 0%, ${colors.accent}25 100%)`,
        }
      case "professional":
        return {
          padding: "py-20",
          titleSize: "text-3xl md:text-4xl",
          titleWeight: "font-semibold",
          subtitleSize: "text-base",
          alignment: "text-center",
          maxWidth: "max-w-4xl",
          background: colors.surface,
        }
      case "student":
        return {
          padding: "py-28",
          titleSize: "text-4xl md:text-6xl",
          titleWeight: "font-bold",
          subtitleSize: "text-xl",
          alignment: "text-center",
          maxWidth: "max-w-4xl",
          background: `linear-gradient(to bottom, ${colors.primary}10, transparent)`,
        }
      default:
        return {
          padding: "py-20",
          titleSize: "text-5xl",
          titleWeight: "font-bold",
          subtitleSize: "text-xl",
          alignment: "text-center",
          maxWidth: "max-w-4xl",
          background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%)`,
        }
    }
  }

  const styles = getTemplateStyles()

  return (
    <section
      className={`relative overflow-hidden px-8 ${styles.padding}`}
      style={{
        background: styles.background,
      }}
    >
      {templateId !== "minimal" && templateId !== "professional" && (
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, ${colors.primary} 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>
      )}

      <div className={`relative mx-auto ${styles.maxWidth} ${styles.alignment}`}>
        {data.showAvatar && profile?.user.avatar_url && (
          <Avatar 
            className={`mb-6 h-32 w-32 border-4 ${templateId === "minimal" ? "" : "mx-auto"}`}
            style={{ borderColor: colors.primary }}
          >
            <AvatarImage src={profile.user.avatar_url} alt={data.title} />
            <AvatarFallback style={{ background: colors.surface }}>
              {data.title.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        <EditableText
          value={data.title}
          onChange={(val) => handleUpdate("title", val)}
          editable={editable}
          className={`mb-4 ${styles.titleSize} ${styles.titleWeight}`}
          style={{ color: colors.text }}
          placeholder="Your Name"
        />

        <EditableText
          value={data.subtitle}
          onChange={(val) => handleUpdate("subtitle", val)}
          editable={editable}
          className={`mb-6 ${styles.subtitleSize}`}
          style={{ color: colors.textMuted }}
          placeholder="Your Title"
        />

        <EditableText
          value={data.description}
          onChange={(val) => handleUpdate("description", val)}
          editable={editable}
          className="mb-8 text-base"
          style={{ color: colors.textMuted }}
          placeholder="Brief description"
        />

        {data.ctaText && (
          <a
            href={data.ctaLink || "#"}
            className={`inline-flex items-center gap-2 rounded-full px-8 py-3 font-medium transition-all hover:scale-105 ${
              templateId === "creative" ? "text-lg" : ""
            }`}
            style={{
              background: colors.primary,
              color: colors.background,
            }}
          >
            {data.ctaText}
          </a>
        )}
      </div>
    </section>
  )
}
