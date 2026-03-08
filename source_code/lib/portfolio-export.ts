import { PortfolioSection } from "./portfolio-schema"
import { PortfolioTheme } from "./portfolio-templates"

export const generatePortfolioHTML = (
  sections: PortfolioSection[],
  theme: PortfolioTheme,
  metadata: { title: string; description: string }
): string => {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order)
  const { colors } = theme

  const css = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: ${colors.background};
      color: ${colors.text};
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
    }

    .section {
      padding: 4rem 2rem;
    }

    .section-heading {
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 2rem;
      color: ${colors.text};
    }

    /* Hero Section */
    .hero {
      text-align: center;
      padding: 5rem 2rem;
      background: linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%);
      position: relative;
      overflow: hidden;
    }

    .hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle at 2px 2px, ${colors.primary} 1px, transparent 0);
      background-size: 40px 40px;
      opacity: 0.1;
    }

    .hero-content {
      position: relative;
      z-index: 1;
    }

    .hero-avatar {
      width: 128px;
      height: 128px;
      border-radius: 50%;
      border: 4px solid ${colors.primary};
      margin: 0 auto 2rem;
      display: block;
    }

    .hero-title {
      font-size: 3rem;
      font-weight: bold;
      margin-bottom: 1rem;
      color: ${colors.text};
    }

    .hero-subtitle {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
      color: ${colors.textMuted};
    }

    .hero-description {
      font-size: 1rem;
      margin-bottom: 2rem;
      color: ${colors.textMuted};
    }

    .btn-primary {
      display: inline-block;
      padding: 0.75rem 2rem;
      background: ${colors.primary};
      color: ${colors.background};
      text-decoration: none;
      border-radius: 9999px;
      font-weight: 500;
      transition: transform 0.2s;
    }

    .btn-primary:hover {
      transform: scale(1.05);
    }

    /* Stats Section */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      max-width: 1000px;
      margin: 0 auto;
    }

    .stat-card {
      background: ${colors.surface};
      border: 1px solid ${colors.border};
      border-radius: 1rem;
      padding: 2rem;
      text-align: center;
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: scale(1.05);
    }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: ${colors.text};
      margin: 0.5rem 0;
    }

    .stat-label {
      font-size: 0.875rem;
      color: ${colors.textMuted};
    }

    /* Skills Section */
    .skills-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      max-width: 1000px;
      margin: 0 auto;
    }

    .skill-tag {
      background: ${colors.primary}20;
      color: ${colors.primary};
      border: 1px solid ${colors.primary}40;
      padding: 0.625rem 1.25rem;
      border-radius: 9999px;
      font-weight: 500;
      transition: transform 0.2s;
    }

    .skill-tag:hover {
      transform: scale(1.05);
    }

    /* Projects Section */
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .project-card {
      background: ${colors.surface};
      border: 1px solid ${colors.border};
      border-radius: 1rem;
      overflow: hidden;
      transition: transform 0.2s;
    }

    .project-card:hover {
      transform: scale(1.05);
    }

    .project-image {
      width: 100%;
      aspect-ratio: 16/9;
      object-fit: cover;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    }

    .project-content {
      padding: 1.5rem;
    }

    .project-title {
      font-size: 1.25rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
      color: ${colors.text};
    }

    .project-description {
      font-size: 0.875rem;
      color: ${colors.textMuted};
      margin-bottom: 1rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .project-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .project-tag {
      background: ${colors.primary}15;
      color: ${colors.primary};
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
    }

    .project-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .project-stats {
      display: flex;
      gap: 1rem;
      font-size: 0.875rem;
      color: ${colors.textMuted};
    }

    .project-link {
      color: ${colors.primary};
      text-decoration: none;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .project-link:hover {
      opacity: 0.8;
    }

    /* Contact Section */
    .contact {
      text-align: center;
    }

    .contact-description {
      font-size: 1rem;
      color: ${colors.textMuted};
      margin-bottom: 2rem;
    }

    .contact-buttons {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem;
    }

    .social-link {
      width: 48px;
      height: 48px;
      background: ${colors.surface};
      border: 1px solid ${colors.border};
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: ${colors.text};
      text-decoration: none;
      transition: transform 0.2s;
    }

    .social-link:hover {
      transform: scale(1.1);
    }

    /* About Section */
    .about-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      max-width: 1000px;
      margin: 0 auto;
    }

    .about-content {
      color: ${colors.textMuted};
      line-height: 1.8;
      margin-bottom: 1.5rem;
    }

    .highlight-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      color: ${colors.text};
    }

    .highlight-icon {
      color: ${colors.primary};
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .hero-title {
        font-size: 2rem;
      }
      
      .section-heading {
        font-size: 2rem;
      }

      .projects-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `

  const renderSection = (section: PortfolioSection): string => {
    if (!section.visible) return ""

    switch (section.type) {
      case "hero":
        return `
          <section class="hero">
            <div class="hero-content">
              ${section.data.showAvatar ? `<img src="${section.data.avatarUrl || ''}" alt="Avatar" class="hero-avatar" />` : ""}
              <h1 class="hero-title">${section.data.title}</h1>
              <p class="hero-subtitle">${section.data.subtitle}</p>
              <p class="hero-description">${section.data.description}</p>
              ${section.data.ctaText ? `<a href="${section.data.ctaLink || '#'}" class="btn-primary">${section.data.ctaText}</a>` : ""}
            </div>
          </section>
        `

      case "stats":
        return `
          <section class="section">
            <div class="container">
              <div class="stats-grid">
                ${section.data.stats.map((stat: any) => `
                  <div class="stat-card">
                    <div class="stat-value">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                  </div>
                `).join("")}
              </div>
            </div>
          </section>
        `

      case "skills":
        return `
          <section class="section">
            <div class="container">
              <h2 class="section-heading">${section.data.heading}</h2>
              <div class="skills-container">
                ${section.data.skills.map((skill: any) => `
                  <span class="skill-tag">${skill.name}${skill.projects ? ` (${skill.projects})` : ""}</span>
                `).join("")}
              </div>
            </div>
          </section>
        `

      case "projects":
        return `
          <section class="section">
            <div class="container">
              <h2 class="section-heading">${section.data.heading}</h2>
              <div class="projects-grid">
                ${section.data.projects.map((project: any) => `
                  <div class="project-card">
                    <img src="${project.image || ''}" alt="${project.name}" class="project-image" onerror="this.style.display='none'" />
                    <div class="project-content">
                      <h3 class="project-title">${project.name}</h3>
                      <p class="project-description">${project.description}</p>
                      <div class="project-tags">
                        ${project.tags.slice(0, 3).map((tag: string) => `<span class="project-tag">${tag}</span>`).join("")}
                      </div>
                      <div class="project-footer">
                        <div class="project-stats">
                          <span>⭐ ${project.stars}</span>
                          <span>🔱 ${project.forks}</span>
                        </div>
                        <a href="${project.url}" target="_blank" rel="noopener noreferrer" class="project-link">
                          View →
                        </a>
                      </div>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          </section>
        `

      case "about":
        return `
          <section class="section">
            <div class="container">
              <h2 class="section-heading">${section.data.heading}</h2>
              <div class="about-grid">
                <div>
                  <p class="about-content">${section.data.content}</p>
                  ${section.data.highlights.map((highlight: string) => `
                    <div class="highlight-item">
                      <span class="highlight-icon">✓</span>
                      <span>${highlight}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>
          </section>
        `

      case "contact":
        return `
          <section class="section contact">
            <div class="container">
              <h2 class="section-heading">${section.data.heading}</h2>
              <p class="contact-description">${section.data.description}</p>
              <div class="contact-buttons">
                ${section.data.email ? `<a href="mailto:${section.data.email}" class="btn-primary">📧 Email Me</a>` : ""}
                ${section.data.social.map((social: any) => `
                  <a href="${social.url}" target="_blank" rel="noopener noreferrer" class="social-link">
                    ${social.platform === "github" ? "🐙" : social.platform === "twitter" ? "🐦" : "🔗"}
                  </a>
                `).join("")}
              </div>
            </div>
          </section>
        `

      default:
        return ""
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${metadata.description}">
  <title>${metadata.title}</title>
  <style>${css}</style>
</head>
<body>
  ${sortedSections.map(renderSection).join("\n")}
</body>
</html>`
}

export const downloadPortfolioHTML = (html: string, filename: string = "portfolio.html") => {
  const blob = new Blob([html], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
