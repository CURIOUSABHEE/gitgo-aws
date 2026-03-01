# GitGo - Complete Application Overview

## 🎯 Mission Statement

GitGo is an AI-powered platform that helps developers discover, contribute to, and showcase their work in open source projects. We make it easy to find projects that match your skills, identify beginner-friendly issues, and build a professional portfolio.

---

## 📊 Platform Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitGo Platform                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Frontend   │  │   Backend    │  │   Database   │          │
│  │  Next.js 15  │◄─┤  API Routes  │◄─┤   MongoDB    │          │
│  │  React 19    │  │  TypeScript  │  │   Redis      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │     Auth     │  │      AI      │  │  Integrations│          │
│  │  NextAuth.js │  │  Groq (4x)   │  │   GitHub     │          │
│  │  GitHub OAuth│  │  LLM Models  │  │   LinkedIn   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Core Features

### 1. **Overview Dashboard** 📈
**Route**: `/dashboard/overview`

A comprehensive summary of the entire platform:
- Platform statistics and health metrics
- Quick action cards for common tasks
- Feature overview with navigation
- User tech stack visualization
- System health monitoring

**Key Metrics**:
- Total curated repositories
- Good first issues available
- GSoC organizations
- User's project count
- Detected programming languages

---

### 2. **Personalized Dashboard** 🎯
**Route**: `/dashboard`

AI-powered project recommendations based on your tech stack:
- **Smart Matching**: Repos matching your GitHub languages
- **Good First Issues**: Beginner-friendly contribution opportunities
- **Real-time Counts**: Live issue counts for each repository
- **Filtering**: All matches, beginner-friendly, most active
- **Detailed View**: Click any repo for deep analysis

**Data Sources**:
- User's GitHub profile and repositories
- Automated repo discovery API
- Good first issue tracking
- Repository metadata and topics

---

### 3. **Explore Projects** 🔍
**Route**: `/dashboard/explore`

Browse the entire curated database:
- **10,000+ Repositories**: High-quality, contributor-friendly projects
- **Advanced Filters**: Language, stars, quality score, issues
- **Quality Scoring**: 0-100 score based on multiple factors
- **Search**: Find specific projects or technologies
- **Sorting**: By stars, recency, issues, quality

**Quality Score Factors** (0-100):
- Stars (20%): Repository popularity
- Recency (20%): Days since last push
- Good First Issues (25%): Beginner opportunities
- Contributing File (15%): Has CONTRIBUTING.md
- CI/CD (10%): Has GitHub Actions
- Activity (10%): Open issues count

---

### 4. **GSoC Organizations** 🏆
**Route**: `/dashboard/gsoc`

Google Summer of Code organization database:
- **200+ Organizations**: GSoC 2026 participants
- **Advanced Filtering**: By category, tech count, popularity
- **Tech Stack Matching**: Find orgs using your languages
- **Detailed Info**: Description, technologies, categories
- **6-Month Caching**: Automatic refresh every 6 months

**Categories**:
- Artificial Intelligence
- Data & Analytics
- Development Tools
- Web & Mobile
- Infrastructure & Cloud
- Security & Privacy
- And 7 more...

---

### 5. **Repository Sync Pipeline** 🔄
**Route**: `/dashboard/repo-sync`

Automated data pipeline for discovering quality projects:

**Pipeline Flow**:
```
GitHub API Search → Quality Scoring → Database Storage
     ↓                    ↓                  ↓
External Sources → Enrichment → Deduplication
     ↓                    ↓                  ↓
goodfirstissue.dev → Validation → MongoDB
up-for-grabs.net
```

**Features**:
- **Automated Sync**: Runs every Sunday at midnight
- **Rate Limiting**: Intelligent GitHub API management
- **Quality Filtering**: Only stores repos with score ≥40
- **Stale Detection**: Archives repos not synced in 30 days
- **Progress Tracking**: Real-time sync status
- **Statistics**: Total repos, languages, avg quality score

**Manual Triggers**:
- Sync GitHub only
- Sync all sources (GitHub + external)
- View sync history and stats

---

### 6. **My Projects** 📁
**Route**: `/dashboard/projects`

Manage your GitHub repositories:
- **All Repos**: Complete list of your repositories
- **Languages**: Detected from your codebase
- **Statistics**: Stars, forks, issues
- **Quick Actions**: View on GitHub, analyze
- **Filtering**: By language, visibility, activity

---

### 7. **Analyze Repository** 🔬
**Route**: `/dashboard/analyze`

AI-powered deep analysis of any GitHub repository:
- **Tech Stack Detection**: Identify all technologies used
- **Code Quality**: Analyze structure and patterns
- **Contribution Guide**: Check for CONTRIBUTING.md
- **Issue Analysis**: Good first issues, help wanted
- **CI/CD Status**: GitHub Actions workflows
- **License Info**: Open source license details
- **Activity Metrics**: Commits, contributors, releases

**AI Features**:
- Route analysis for web applications
- Architecture visualization
- Code complexity assessment
- Contribution difficulty rating

---

### 8. **Community** 👥
**Route**: `/dashboard/community`

Connect with other contributors:
- **Coming Soon**: Community features
- **Planned**: Discussion forums
- **Planned**: Contributor profiles
- **Planned**: Project showcases

---

### 9. **Portfolio Builder** 🎨
**Route**: `/dashboard/portfolio`

Create a professional developer portfolio:
- **Templates**: Minimal, Creative, Professional, Student
- **Auto-Generation**: From your GitHub data
- **Customization**: Edit sections, add/remove content
- **Deployment**: Subdomain hosting
- **Sections**: About, Projects, Skills, Experience, Education

**Portfolio Features**:
- Responsive design
- Dark/light mode
- SEO optimized
- Fast loading
- Mobile-friendly

---

## 🛠️ Technical Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Components**: Radix UI, shadcn/ui
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **State**: React Hooks
- **Notifications**: React Hot Toast

### Backend
- **Runtime**: Node.js
- **API**: Next.js API Routes
- **Authentication**: NextAuth.js
- **Database**: MongoDB (Mongoose)
- **Cache**: Redis (ioredis)
- **AI**: Groq (4 API keys for load distribution)

### Integrations
- **GitHub**: OAuth, REST API, GraphQL
- **LinkedIn**: OAuth, Profile API
- **External Sources**: 
  - goodfirstissue.dev (scraping)
  - up-for-grabs.net (API)
  - gsocorganizations.dev (API)

### DevOps
- **Deployment**: Vercel
- **Cron Jobs**: Vercel Cron
- **Environment**: .env configuration
- **Version Control**: Git

---

## 📦 Data Models

### 1. **ContributorFriendlyRepo**
Stores curated repositories with quality scores:
```typescript
{
  githubId: number
  name: string
  fullName: string
  description: string
  htmlUrl: string
  language: string
  topics: string[]
  stargazersCount: number
  openIssuesCount: number
  forksCount: number
  lastPushedAt: Date
  hasContributingFile: boolean
  hasCI: boolean
  licenseName: string
  goodFirstIssueCount: number
  helpWantedCount: number
  qualityScore: number (0-100)
  source: "github" | "goodfirstissue" | "upforgrabs"
  lastSyncedAt: Date
  syncStatus: "active" | "archived" | "deleted"
}
```

### 2. **DiscoveredRepos**
Caches personalized repo recommendations:
```typescript
{
  userId: string
  languages: string[]
  repos: Repository[]
  lastFetchedAt: Date
}
```

### 3. **GsocOrganizations**
Stores GSoC organization data:
```typescript
{
  year: number
  organizations: Organization[]
  lastFetchedAt: Date
}
```

### 4. **Portfolio**
User portfolio configurations:
```typescript
{
  userId: string
  username: string
  template: string
  sections: Section[]
  theme: "light" | "dark"
  published: boolean
}
```

### 5. **RepositoryAnalysis**
Cached repository analysis results:
```typescript
{
  repoFullName: string
  analysis: AnalysisData
  analyzedAt: Date
}
```

---

## 🔐 Authentication & Authorization

### GitHub OAuth
- **Scopes**: `read:user`, `user:email`, `repo`
- **Provider**: NextAuth.js
- **Session**: JWT-based
- **Token**: Stored in session for API calls

### LinkedIn OAuth
- **Scopes**: `r_liteprofile`, `r_emailaddress`
- **Provider**: NextAuth.js
- **Integration**: Profile enrichment

---

## 🤖 AI & Machine Learning

### Groq Integration
- **4 API Keys**: Load distribution across keys
- **Models**: llama-3.3-70b-versatile
- **Use Cases**:
  - Repository analysis
  - Code quality assessment
  - Route detection
  - Tech stack identification
  - Contribution difficulty rating

### Quality Scoring Algorithm
Calculates 0-100 score for repositories:
```typescript
Score = (
  starsScore * 0.20 +
  recencyScore * 0.20 +
  issuesScore * 0.25 +
  contributingScore * 0.15 +
  ciScore * 0.10 +
  activityScore * 0.10
)
```

---

## 📊 API Endpoints

### Repository APIs
- `GET /api/github/discover-repos` - Personalized recommendations
- `GET /api/github/good-first-issues` - Count good first issues
- `POST /api/repos/sync` - Manual sync trigger
- `GET /api/repos/sync` - Sync statistics
- `GET /api/cron/sync-repos` - Automated sync (cron)

### GSoC APIs
- `GET /api/gsoc/organizations` - Fetch GSoC orgs

### Portfolio APIs
- `GET /api/portfolio` - Get user portfolio
- `POST /api/portfolio` - Create/update portfolio

### Analysis APIs
- `POST /api/analyze/repository` - Analyze repository
- `POST /api/analyze/route` - Analyze routes

---

## 🔄 Automated Processes

### Weekly Repository Sync
**Schedule**: Every Sunday at midnight (UTC)
**Process**:
1. Fetch repos from GitHub API (multiple queries)
2. Fetch from external sources (optional)
3. Enrich with metadata (CONTRIBUTING, CI/CD, issues)
4. Calculate quality scores
5. Store repos with score ≥40
6. Mark stale repos as archived
7. Update statistics

**Rate Limiting**:
- 5000 requests/hour (GitHub)
- Automatic sleep when low
- Progress logging

### Cache Management
**24-Hour Cache**:
- Discovered repos (personalized)
- Repository analysis results

**6-Month Cache**:
- GSoC organizations

**Stale Detection**:
- Repos not synced in 30 days → archived

---

## 📈 Performance Metrics

### Expected Performance
- **Page Load**: <2s (initial)
- **API Response**: <500ms (cached)
- **Sync Duration**: 2-3 hours (10,000 repos)
- **Database Queries**: <100ms (indexed)

### Scalability
- **Repositories**: 10,000+ (current), 100,000+ (target)
- **Users**: Unlimited (stateless auth)
- **Concurrent Requests**: 1000+ (Vercel)

---

## 🎨 User Experience

### Design System
- **Colors**: Primary, secondary, accent
- **Typography**: Inter font family
- **Spacing**: 4px base unit
- **Breakpoints**: Mobile, tablet, desktop
- **Dark Mode**: Full support

### Accessibility
- **WCAG 2.1**: Level AA compliance
- **Keyboard Navigation**: Full support
- **Screen Readers**: ARIA labels
- **Color Contrast**: 4.5:1 minimum

---

## 🚦 Getting Started

### Prerequisites
```bash
Node.js 18+
MongoDB
Redis (optional)
GitHub Account
```

### Installation
```bash
# Clone repository
git clone <repo-url>
cd source_code

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your API keys and secrets

# Run development server
npm run dev
```

### Environment Variables
```bash
# GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_TOKEN=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Database
MONGODB_URI=

# AI
GROQ_API_KEY=
GROQ_API_KEY_1=
GROQ_API_KEY_2=
GROQ_API_KEY_3=

# Cron
CRON_SECRET=
```

---

## 📚 Documentation

- **README.md**: Project overview
- **REPO_PIPELINE_README.md**: Pipeline documentation
- **REPO_PIPELINE_QUICKSTART.md**: Quick start guide
- **APP_OVERVIEW.md**: This file

---

## 🎯 Roadmap

### Phase 1: Core Features ✅
- [x] GitHub authentication
- [x] Repository discovery
- [x] Good first issue tracking
- [x] GSoC organizations
- [x] Repository sync pipeline
- [x] Portfolio builder

### Phase 2: Enhanced Features 🚧
- [ ] Community features
- [ ] Advanced analytics
- [ ] Contribution tracking
- [ ] Gamification
- [ ] Notifications

### Phase 3: Scale & Optimize 📋
- [ ] GraphQL API
- [ ] Real-time updates
- [ ] Mobile app
- [ ] Browser extension
- [ ] API for third-party integrations

---

## 🤝 Contributing

We welcome contributions! See our contributing guide for:
- Code style guidelines
- Pull request process
- Issue reporting
- Feature requests

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **GitHub**: For the amazing API
- **Groq**: For AI capabilities
- **Vercel**: For hosting
- **Open Source Community**: For inspiration

---

## 📞 Support

- **Documentation**: See docs folder
- **Issues**: GitHub Issues
- **Email**: support@gitgo.dev
- **Discord**: Coming soon

---

**Built with ❤️ for the open source community**
