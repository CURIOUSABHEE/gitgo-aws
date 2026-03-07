"use client"

import { Star, GitFork, Users, Code } from "lucide-react"
import { PortfolioTheme } from "@/lib/portfolio-templates"

interface StatsSectionProps {
  data: {
    heading?: string
    stats: Array<{
      label: string
      value: number
      icon: string
    }>
  }
  theme: PortfolioTheme
  templateId: string
  editable?: boolean
  onUpdate?: (data: any) => void
}

const iconMap: Record<string, any> = {
  star: Star,
  fork: GitFork,
  users: Users,
  repo: Code,
}

export function StatsSection({ data, theme, templateId }: StatsSectionProps) {
  const { colors } = theme

  return (
    <section className="px-8 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {data.stats.map((stat, index) => {
            const Icon = iconMap[stat.icon] || Code
            return (
              <div
                key={index}
                className="rounded-2xl p-6 text-center transition-transform hover:scale-105"
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Icon className="mx-auto mb-3 h-8 w-8" style={{ color: colors.primary }} />
                <div className="text-3xl font-bold" style={{ color: colors.text }}>
                  {stat.value}
                </div>
                <div className="mt-1 text-sm" style={{ color: colors.textMuted }}>
                  {stat.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
