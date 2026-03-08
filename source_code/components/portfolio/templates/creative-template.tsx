"use client"

import { Github, Mail, Star, GitFork, ExternalLink, Sparkles } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PortfolioTheme } from "@/lib/portfolio-templates"

interface CreativeTemplateProps {
  profile: any
  technologies: any
  theme: PortfolioTheme
}

export function CreativeTemplate({ profile, technologies, theme }: CreativeTemplateProps) {
  const { colors } = theme
  const userName = profile.user.name || profile.user.login
  const userBio = profile.user.bio || "Developer | Open Source Contributor"
  
  const topProjects = [...profile.repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 6)
  
  const topSkills = technologies?.mostUsed?.slice(0, 10) || []

  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: colors.background,
        color: colors.text 
      }}
    >
      {/* Asymmetric Hero */}
      <div className="relative overflow-hidden">
        {/* Decorative shapes */}
        <div 
          className="absolute right-0 top-0 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: colors.primary }}
        />
        <div 
          className="absolute bottom-0 left-0 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ background: colors.accent }}
        />
        
        <div className="relative grid min-h-screen items-center gap-12 px-8 py-16 md:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: `${colors.primary}20`, color: colors.primary }}>
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Available for opportunities</span>
            </div>
            
            <h1 className="mb-4 text-6xl font-bold leading-tight" style={{ color: colors.text }}>
              {userName}
            </h1>
            <p className="mb-8 text-2xl" style={{ color: colors.textMuted }}>
              {userBio}
            </p>
            
            <div className="flex gap-4">
              <a
                href={`https://github.com/${profile.user.login}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-2xl px-8 py-4 font-bold transition-transform hover:scale-105"
                style={{ 
                  background: colors.primary,
                  color: colors.background 
                }}
              >
                <Github className="h-5 w-5" />
                View GitHub
              </a>
              {profile.user.email && (
                <a
                  href={`mailto:${profile.user.email}`}
                  className="flex items-center gap-2 rounded-2xl px-8 py-4 font-bold transition-transform hover:scale-105"
                  style={{ 
                    background: colors.surface,
                    color: colors.text,
                    border: `2px solid ${colors.border}`
                  }}
                >
                  <Mail className="h-5 w-5" />
                  Contact
                </a>
              )}
            </div>
          </div>
          
          <div className="flex justify-center">
            <div className="relative">
              <div 
                className="absolute inset-0 rounded-3xl opacity-50 blur-2xl"
                style={{ background: colors.primary }}
              />
              <Avatar className="relative h-80 w-80 rounded-3xl border-4" style={{ borderColor: colors.primary }}>
                <AvatarImage src={profile.user.avatar_url} alt={userName} className="rounded-3xl" />
                <AvatarFallback className="rounded-3xl text-6xl" style={{ background: colors.surface }}>
                  {userName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      {/* Stats with Creative Layout */}
      <div className="px-8 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { label: "Repositories", value: profile.stats.totalRepos, color: colors.primary },
              { label: "Stars Earned", value: profile.stats.totalStars, color: colors.accent },
              { label: "Total Forks", value: profile.stats.totalForks, color: colors.primary },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="relative overflow-hidden rounded-3xl p-8"
                style={{ 
                  background: colors.surface,
                  transform: `rotate(${index % 2 === 0 ? '-2deg' : '2deg'})`
                }}
              >
                <div 
                  className="absolute right-0 top-0 h-32 w-32 rounded-full opacity-20 blur-2xl"
                  style={{ background: stat.color }}
                />
                <div className="relative">
                  <div className="text-5xl font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                  <div className="mt-2 text-lg font-medium" style={{ color: colors.textMuted }}>
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Skills with Progress Bars */}
      {topSkills.length > 0 && (
        <div className="px-8 py-16" style={{ background: colors.surface }}>
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-12 text-4xl font-bold" style={{ color: colors.text }}>
              Skills & Expertise
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {topSkills.map((skill: any) => {
                const percentage = Math.min((skill.totalProjects / profile.stats.totalRepos) * 100, 100)
                return (
                  <div key={skill.technology}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium" style={{ color: colors.text }}>
                        {skill.technology}
                      </span>
                      <span className="text-sm" style={{ color: colors.textMuted }}>
                        {skill.totalProjects} projects
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full" style={{ background: `${colors.primary}20` }}>
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${percentage}%`,
                          background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Projects Masonry Grid */}
      {topProjects.length > 0 && (
        <div className="px-8 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-12 text-4xl font-bold" style={{ color: colors.text }}>
              Featured Work
            </h2>
            <div className="columns-1 gap-6 md:columns-2">
              {topProjects.map((project, index) => (
                <a
                  key={project.id}
                  href={project.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mb-6 block break-inside-avoid overflow-hidden rounded-3xl transition-transform hover:scale-105"
                  style={{ 
                    background: colors.surface,
                    border: `2px solid ${colors.border}`
                  }}
                >
                  <div 
                    className="h-32 p-6"
                    style={{ 
                      background: `linear-gradient(135deg, ${colors.primary}40, ${colors.accent}40)`
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="text-2xl font-bold" style={{ color: colors.text }}>
                        {project.name}
                      </h3>
                      <ExternalLink className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: colors.primary }} />
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {project.description && (
                      <p className="mb-4" style={{ color: colors.textMuted }}>
                        {project.description}
                      </p>
                    )}
                    
                    <div className="mb-4 flex items-center gap-4 text-sm" style={{ color: colors.textMuted }}>
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        {project.stargazers_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="h-4 w-4" />
                        {project.forks_count}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {project.language && (
                        <span 
                          className="rounded-full px-3 py-1 text-xs font-bold"
                          style={{ 
                            background: colors.primary,
                            color: colors.background 
                          }}
                        >
                          {project.language}
                        </span>
                      )}
                      {project.topics?.slice(0, 2).map((topic: string) => (
                        <span
                          key={topic}
                          className="rounded-full px-3 py-1 text-xs"
                          style={{ 
                            background: `${colors.accent}30`,
                            color: colors.accent 
                          }}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
