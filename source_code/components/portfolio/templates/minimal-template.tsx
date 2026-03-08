"use client"

import { Github, Mail, MapPin, LinkIcon, ExternalLink } from "lucide-react"
import { PortfolioTheme } from "@/lib/portfolio-templates"

interface MinimalTemplateProps {
  profile: any
  technologies: any
  theme: PortfolioTheme
}

export function MinimalTemplate({ profile, technologies, theme }: MinimalTemplateProps) {
  const { colors } = theme
  const userName = profile.user.name || profile.user.login
  const userBio = profile.user.bio || "Developer | Open Source Contributor"
  
  const topProjects = [...profile.repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 8)
  
  const topSkills = technologies?.mostUsed?.slice(0, 15) || []

  return (
    <div 
      className="min-h-screen px-8 py-16"
      style={{ 
        background: colors.background,
        color: colors.text 
      }}
    >
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <header className="mb-16">
          <h1 className="mb-2 text-4xl font-light tracking-tight" style={{ color: colors.text }}>
            {userName}
          </h1>
          <p className="mb-6 text-lg font-light" style={{ color: colors.textMuted }}>
            {userBio}
          </p>
          
          <div className="mb-4 flex flex-wrap gap-4 text-sm" style={{ color: colors.textMuted }}>
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
          </div>
          
          <div className="flex gap-4 text-sm">
            <a
              href={`https://github.com/${profile.user.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 underline-offset-4 hover:underline"
              style={{ color: colors.primary }}
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            {profile.user.email && (
              <a
                href={`mailto:${profile.user.email}`}
                className="flex items-center gap-1.5 underline-offset-4 hover:underline"
                style={{ color: colors.primary }}
              >
                <Mail className="h-4 w-4" />
                Email
              </a>
            )}
          </div>
        </header>

        {/* Stats */}
        <section className="mb-16 border-l-2 pl-6" style={{ borderColor: colors.border }}>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-light" style={{ color: colors.text }}>
                {profile.stats.totalRepos}
              </div>
              <div className="text-sm" style={{ color: colors.textMuted }}>
                Repositories
              </div>
            </div>
            <div>
              <div className="text-3xl font-light" style={{ color: colors.text }}>
                {profile.stats.totalStars}
              </div>
              <div className="text-sm" style={{ color: colors.textMuted }}>
                Stars
              </div>
            </div>
            <div>
              <div className="text-3xl font-light" style={{ color: colors.text }}>
                {profile.stats.totalForks}
              </div>
              <div className="text-sm" style={{ color: colors.textMuted }}>
                Forks
              </div>
            </div>
          </div>
        </section>

        {/* Skills */}
        {topSkills.length > 0 && (
          <section className="mb-16">
            <h2 className="mb-6 text-sm font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {topSkills.map((skill: any) => (
                <span
                  key={skill.technology}
                  className="text-sm"
                  style={{ color: colors.text }}
                  title={`Used in ${skill.totalProjects} project${skill.totalProjects !== 1 ? 's' : ''}`}
                >
                  {skill.technology}
                  <span style={{ color: colors.textMuted }}> · </span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {topProjects.length > 0 && (
          <section>
            <h2 className="mb-6 text-sm font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
              Projects
            </h2>
            <div className="space-y-8">
              {topProjects.map((project) => (
                <article key={project.id} className="group">
                  <a
                    href={project.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 flex items-center gap-2"
                  >
                    <h3 className="text-lg font-medium underline-offset-4 group-hover:underline" style={{ color: colors.text }}>
                      {project.name}
                    </h3>
                    <ExternalLink className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: colors.primary }} />
                  </a>
                  
                  {project.description && (
                    <p className="mb-3 font-light" style={{ color: colors.textMuted }}>
                      {project.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-sm" style={{ color: colors.textMuted }}>
                    {project.language && (
                      <span>{project.language}</span>
                    )}
                    <span>★ {project.stargazers_count}</span>
                    {project.topics?.slice(0, 3).map((topic: string) => (
                      <span key={topic}>#{topic}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-16 border-t pt-8 text-center text-sm" style={{ borderColor: colors.border, color: colors.textMuted }}>
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </footer>
      </div>
    </div>
  )
}
