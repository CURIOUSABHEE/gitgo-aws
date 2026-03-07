"use client"

import { Github, Mail, MapPin, LinkIcon, Briefcase, Award, ExternalLink } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PortfolioTheme } from "@/lib/portfolio-templates"

interface ProfessionalTemplateProps {
  profile: any
  technologies: any
  theme: PortfolioTheme
}

export function ProfessionalTemplate({ profile, technologies, theme }: ProfessionalTemplateProps) {
  const { colors } = theme
  const userName = profile.user.name || profile.user.login
  const userBio = profile.user.bio || "Developer | Open Source Contributor"
  
  const topProjects = [...profile.repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 6)
  
  const topSkills = technologies?.mostUsed?.slice(0, 12) || []

  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: colors.background,
        color: colors.text 
      }}
    >
      {/* Professional Header */}
      <header className="border-b px-8 py-8" style={{ borderColor: colors.border, background: colors.surface }}>
        <div className="mx-auto flex max-w-5xl items-center gap-8">
          <Avatar className="h-32 w-32 border-2" style={{ borderColor: colors.border }}>
            <AvatarImage src={profile.user.avatar_url} alt={userName} />
            <AvatarFallback style={{ background: colors.background }}>
              {userName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h1 className="mb-2 text-3xl font-bold" style={{ color: colors.text }}>
              {userName}
            </h1>
            <p className="mb-4 text-lg" style={{ color: colors.textMuted }}>
              {userBio}
            </p>
            
            <div className="flex flex-wrap gap-4 text-sm" style={{ color: colors.textMuted }}>
              {profile.user.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {profile.user.location}
                </span>
              )}
              {profile.user.blog && (
                <span className="flex items-center gap-1.5">
                  <LinkIcon className="h-4 w-4" />
                  {profile.user.blog}
                </span>
              )}
              <a
                href={`https://github.com/${profile.user.login}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:underline"
                style={{ color: colors.primary }}
              >
                <Github className="h-4 w-4" />
                GitHub Profile
              </a>
              {profile.user.email && (
                <a
                  href={`mailto:${profile.user.email}`}
                  className="flex items-center gap-1.5 hover:underline"
                  style={{ color: colors.primary }}
                >
                  <Mail className="h-4 w-4" />
                  {profile.user.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-8 py-12">
        {/* Professional Summary */}
        <section className="mb-12">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold" style={{ color: colors.text }}>
            <Briefcase className="h-6 w-6" style={{ color: colors.primary }} />
            Professional Summary
          </h2>
          <div className="rounded-lg border p-6" style={{ borderColor: colors.border, background: colors.surface }}>
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold" style={{ color: colors.primary }}>
                  {profile.stats.totalRepos}
                </div>
                <div className="mt-1 text-sm" style={{ color: colors.textMuted }}>
                  Total Repositories
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold" style={{ color: colors.primary }}>
                  {profile.stats.totalStars}
                </div>
                <div className="mt-1 text-sm" style={{ color: colors.textMuted }}>
                  Stars Received
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold" style={{ color: colors.primary }}>
                  {profile.stats.totalForks}
                </div>
                <div className="mt-1 text-sm" style={{ color: colors.textMuted }}>
                  Project Forks
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Skills */}
        {topSkills.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold" style={{ color: colors.text }}>
              <Award className="h-6 w-6" style={{ color: colors.primary }} />
              Technical Skills
            </h2>
            <div className="rounded-lg border p-6" style={{ borderColor: colors.border, background: colors.surface }}>
              <div className="grid gap-4 md:grid-cols-2">
                {topSkills.map((skill: any) => (
                  <div 
                    key={skill.technology}
                    className="flex items-center justify-between rounded-md border p-3"
                    style={{ borderColor: colors.border }}
                  >
                    <span className="font-medium" style={{ color: colors.text }}>
                      {skill.technology}
                    </span>
                    <span 
                      className="rounded-full px-3 py-1 text-xs font-medium"
                      style={{ 
                        background: `${colors.primary}20`,
                        color: colors.primary 
                      }}
                    >
                      {skill.totalProjects} {skill.totalProjects === 1 ? 'project' : 'projects'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Portfolio Projects */}
        {topProjects.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-bold" style={{ color: colors.text }}>
              Portfolio Projects
            </h2>
            <div className="space-y-6">
              {topProjects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-lg border p-6"
                  style={{ borderColor: colors.border, background: colors.surface }}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="mb-2 text-xl font-bold" style={{ color: colors.text }}>
                        {project.name}
                      </h3>
                      {project.description && (
                        <p style={{ color: colors.textMuted }}>
                          {project.description}
                        </p>
                      )}
                    </div>
                    <a
                      href={project.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md p-2 transition-colors hover:bg-opacity-80"
                      style={{ background: `${colors.primary}20`, color: colors.primary }}
                    >
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  </div>
                  
                  <div className="mb-4 flex items-center gap-6 text-sm" style={{ color: colors.textMuted }}>
                    {project.language && (
                      <span className="font-medium" style={{ color: colors.text }}>
                        {project.language}
                      </span>
                    )}
                    <span>★ {project.stargazers_count} stars</span>
                    <span>⑂ {project.forks_count} forks</span>
                  </div>
                  
                  {project.topics && project.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.topics.slice(0, 5).map((topic: string) => (
                        <span
                          key={topic}
                          className="rounded border px-2 py-1 text-xs"
                          style={{ 
                            borderColor: colors.border,
                            color: colors.textMuted 
                          }}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t px-8 py-6 text-center" style={{ borderColor: colors.border }}>
        <p className="text-sm" style={{ color: colors.textMuted }}>
          © {new Date().getFullYear()} {userName}. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
