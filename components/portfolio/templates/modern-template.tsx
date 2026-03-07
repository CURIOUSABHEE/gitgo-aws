"use client"

import { Github, Mail, MapPin, LinkIcon, Star, GitFork, ExternalLink } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PortfolioTheme } from "@/lib/portfolio-templates"

interface ModernTemplateProps {
  profile: any
  technologies: any
  theme: PortfolioTheme
}

export function ModernTemplate({ profile, technologies, theme }: ModernTemplateProps) {
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
        background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.secondary} 100%)`,
        color: colors.text 
      }}
    >
      {/* Hero Section with Gradient */}
      <div 
        className="relative overflow-hidden px-8 py-20"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%)`
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, ${colors.primary} 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        <div className="relative mx-auto max-w-4xl text-center">
          <Avatar className="mx-auto mb-6 h-32 w-32 border-4" style={{ borderColor: colors.primary }}>
            <AvatarImage src={profile.user.avatar_url} alt={userName} />
            <AvatarFallback style={{ background: colors.surface }}>
              {userName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <h1 className="mb-4 text-5xl font-bold" style={{ color: colors.text }}>
            {userName}
          </h1>
          <p className="mb-6 text-xl" style={{ color: colors.textMuted }}>
            {userBio}
          </p>
          
          <div className="mb-6 flex items-center justify-center gap-6 text-sm" style={{ color: colors.textMuted }}>
            {profile.user.location && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {profile.user.location}
              </span>
            )}
            {profile.user.blog && (
              <span className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                {profile.user.blog}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-4">
            <a
              href={`https://github.com/${profile.user.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full px-6 py-3 font-medium transition-all hover:scale-105"
              style={{ 
                background: colors.primary,
                color: colors.background 
              }}
            >
              <Github className="h-5 w-5" />
              GitHub Profile
            </a>
            {profile.user.email && (
              <a
                href={`mailto:${profile.user.email}`}
                className="flex items-center gap-2 rounded-full px-6 py-3 font-medium transition-all hover:scale-105"
                style={{ 
                  background: colors.surface,
                  color: colors.text,
                  border: `1px solid ${colors.border}`
                }}
              >
                <Mail className="h-5 w-5" />
                Contact
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mx-auto max-w-4xl px-8 py-12">
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: "Repositories", value: profile.stats.totalRepos, icon: GitFork },
            { label: "Stars Earned", value: profile.stats.totalStars, icon: Star },
            { label: "Total Forks", value: profile.stats.totalForks, icon: GitFork },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-6 text-center transition-transform hover:scale-105"
              style={{ 
                background: colors.surface,
                border: `1px solid ${colors.border}`
              }}
            >
              <stat.icon className="mx-auto mb-3 h-8 w-8" style={{ color: colors.primary }} />
              <div className="text-3xl font-bold" style={{ color: colors.text }}>
                {stat.value}
              </div>
              <div className="mt-1 text-sm" style={{ color: colors.textMuted }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills Section */}
      {topSkills.length > 0 && (
        <div className="mx-auto max-w-4xl px-8 py-12">
          <h2 className="mb-8 text-3xl font-bold" style={{ color: colors.text }}>
            Skills & Technologies
          </h2>
          <div className="flex flex-wrap gap-3">
            {topSkills.map((skill: any) => (
              <span
                key={skill.technology}
                className="group relative cursor-pointer rounded-full px-5 py-2.5 font-medium transition-all hover:scale-105"
                style={{ 
                  background: `${colors.primary}20`,
                  color: colors.primary,
                  border: `1px solid ${colors.primary}40`
                }}
                title={`Used in ${skill.totalProjects} project${skill.totalProjects !== 1 ? 's' : ''}`}
              >
                {skill.technology}
                <span 
                  className="ml-2 rounded-full px-2 py-0.5 text-xs"
                  style={{ 
                    background: colors.primary,
                    color: colors.background 
                  }}
                >
                  {skill.totalProjects}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Projects Section */}
      {topProjects.length > 0 && (
        <div className="mx-auto max-w-4xl px-8 py-12">
          <h2 className="mb-8 text-3xl font-bold" style={{ color: colors.text }}>
            Featured Projects
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {topProjects.map((project) => (
              <a
                key={project.id}
                href={project.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl p-6 transition-all hover:scale-105"
                style={{ 
                  background: colors.surface,
                  border: `1px solid ${colors.border}`
                }}
              >
                <div className="mb-4 flex items-start justify-between">
                  <h3 className="text-xl font-semibold" style={{ color: colors.text }}>
                    {project.name}
                  </h3>
                  <ExternalLink 
                    className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100" 
                    style={{ color: colors.primary }}
                  />
                </div>
                
                {project.description && (
                  <p className="mb-4 line-clamp-2" style={{ color: colors.textMuted }}>
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
                      className="rounded-full px-3 py-1 text-xs font-medium"
                      style={{ 
                        background: `${colors.primary}20`,
                        color: colors.primary 
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
                        background: `${colors.accent}20`,
                        color: colors.accent 
                      }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t px-8 py-8 text-center" style={{ borderColor: colors.border }}>
        <p style={{ color: colors.textMuted }}>
          Built with ❤️ using GitHub data
        </p>
      </div>
    </div>
  )
}
