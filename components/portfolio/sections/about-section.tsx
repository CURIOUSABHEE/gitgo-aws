"use client"

import { PortfolioTheme } from "@/lib/portfolio-templates"
import { EditableText } from "../editable-text"
import { CheckCircle } from "lucide-react"

interface AboutSectionProps {
  data: {
    heading: string
    content: string
    image?: string
    highlights: string[]
  }
  theme: PortfolioTheme
  templateId: string
  editable?: boolean
  onUpdate?: (data: any) => void
}

export function AboutSection({ data, theme, templateId, editable, onUpdate }: AboutSectionProps) {
  const { colors } = theme

  const handleUpdate = (field: string, value: string) => {
    onUpdate?.({ ...data, [field]: value })
  }

  return (
    <section className="px-8 py-12">
      <div className="mx-auto max-w-4xl">
        <EditableText
          value={data.heading}
          onChange={(val) => handleUpdate("heading", val)}
          editable={editable}
          className="mb-8 text-3xl font-bold"
          style={{ color: colors.text }}
          placeholder="About Me"
        />

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <EditableText
              value={data.content}
              onChange={(val) => handleUpdate("content", val)}
              editable={editable}
              className="mb-6 text-base leading-relaxed"
              style={{ color: colors.textMuted }}
              placeholder="Tell your story..."
              multiline
            />

            <div className="space-y-3">
              {data.highlights.map((highlight, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 shrink-0" style={{ color: colors.primary }} />
                  <span style={{ color: colors.text }}>{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          {data.image && (
            <div className="overflow-hidden rounded-2xl" style={{ border: `1px solid ${colors.border}` }}>
              <img src={data.image} alt="About" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
