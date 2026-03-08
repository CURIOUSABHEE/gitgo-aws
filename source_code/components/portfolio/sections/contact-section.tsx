"use client"

import { Mail, Github, Linkedin, Twitter, Globe } from "lucide-react"
import { PortfolioTheme } from "@/lib/portfolio-templates"
import { EditableText } from "../editable-text"

interface ContactSectionProps {
  data: {
    heading: string
    description: string
    email: string
    social: Array<{
      platform: string
      url: string
      icon: string
    }>
    showForm?: boolean
  }
  theme: PortfolioTheme
  templateId: string
  editable?: boolean
  onUpdate?: (data: any) => void
}

const iconMap: Record<string, any> = {
  github: Github,
  linkedin: Linkedin,
  twitter: Twitter,
  link: Globe,
  website: Globe,
}

export function ContactSection({ data, theme, templateId, editable, onUpdate }: ContactSectionProps) {
  const { colors } = theme

  const handleUpdate = (field: string, value: string) => {
    onUpdate?.({ ...data, [field]: value })
  }

  return (
    <section className="px-8 py-12">
      <div className="mx-auto max-w-4xl text-center">
        <EditableText
          value={data.heading}
          onChange={(val) => handleUpdate("heading", val)}
          editable={editable}
          className="mb-4 text-3xl font-bold"
          style={{ color: colors.text }}
          placeholder="Get In Touch"
        />

        <EditableText
          value={data.description}
          onChange={(val) => handleUpdate("description", val)}
          editable={editable}
          className="mb-8 text-base"
          style={{ color: colors.textMuted }}
          placeholder="Let's connect!"
        />

        <div className="flex flex-wrap items-center justify-center gap-4">
          {data.email && (
            <a
              href={`mailto:${data.email}`}
              className="flex items-center gap-2 rounded-full px-6 py-3 font-medium transition-all hover:scale-105"
              style={{
                background: colors.primary,
                color: colors.background,
              }}
            >
              <Mail className="h-5 w-5" />
              Email Me
            </a>
          )}

          {data.social.map((social, index) => {
            const Icon = iconMap[social.icon] || Globe
            return (
              <a
                key={index}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-110"
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              >
                <Icon className="h-5 w-5" />
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
