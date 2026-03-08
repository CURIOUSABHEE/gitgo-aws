# gitgo - System Design Document

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│                     (Next.js Frontend)                       │
│                      Tailwind CSS                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│              Next.js (Frontend + Backend)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Next.js API Routes                       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │   │
│  │  │   Auth     │  │ Community  │  │  Projects  │    │   │
│  │  │   APIs     │  │    APIs    │  │    APIs    │    │   │
│  │  └────────────┘  └────────────┘  └────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │NextAuth  │  │   AI     │  │  GitHub  │  │Socket.io │   │
│  │  Auth    │  │ Service  │  │   API    │  │Real-time │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │PostgreSQL│  │  Prisma  │  │   AWS    │                  │
│  │ Database │  │   ORM    │  │   S3     │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  External Services                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  GitHub  │  │ LinkedIn │  │    AI    │                  │
│  │   API    │  │   API    │  │  Service │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

**Frontend:**
- Framework: Next.js
- Styling: Tailwind CSS
- Language: JavaScript/TypeScript

**Backend:**
- Framework: Next.js (API Routes)
- Authentication: NextAuth
- ORM: Prisma
- Real-time: Socket.io

**Database:**
- Primary: PostgreSQL
- Hosting: AWS RDS

**Infrastructure:**
- Hosting: AWS EC2
- Storage: AWS S3
- Database: AWS RDS

**External Integrations:**
- GitHub API
- LinkedIn API
- AI Services

## 2. Database Design

### 2.1 Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────┐         
│    User     │────────<│   Follow    │>────────┐
└─────────────┘         └─────────────┘         │
      │                                          │
      │ 1:N                                      │
      ↓                                          ↓
┌─────────────┐         ┌─────────────┐   ┌─────────────┐
│    Post     │────────<│   Comment   │   │    User     │
└─────────────┘         └─────────────┘   └─────────────┘
      │                       │                   │
      │ M:N                   │ 1:N               │ 1:N
      ↓                       ↓                   ↓
┌─────────────┐         ┌─────────────┐   ┌─────────────┐
│   Project   │         │    Like     │   │  Portfolio  │
└─────────────┘         └─────────────┘   └─────────────┘
      │                                          │
      │ 1:N                                      │
      ↓                                          │
┌─────────────┐                                  │
│Notification │                                  │
└─────────────┘                                  │
                                                 │
┌─────────────┐                                  │
│   Resume    │<─────────────────────────────────┘
└─────────────┘
```

### 2.2 Core Database Schema

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  github_username VARCHAR(100),
  github_id VARCHAR(50),
  linkedin_url TEXT,
  skills JSONB DEFAULT '[]',
  experience_level VARCHAR(20) DEFAULT 'beginner',
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id BIGINT UNIQUE,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  description TEXT,
  html_url TEXT NOT NULL,
  language VARCHAR(50),
  languages JSONB DEFAULT '{}',
  topics JSONB DEFAULT '[]',
  stars_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  open_issues_count INTEGER DEFAULT 0,
  difficulty_level VARCHAR(20),
  is_trending BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Posts Table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  code_snippet TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comments Table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Follows Table
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Likes Table
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Portfolios Table
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200),
  bio TEXT,
  template VARCHAR(50) DEFAULT 'default',
  is_public BOOLEAN DEFAULT true,
  is_deployed BOOLEAN DEFAULT false,
  deployment_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Resumes Table
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- AI Analysis Cache Table
CREATE TABLE ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL,
  summary TEXT,
  tech_stack JSONB,
  file_structure JSONB,
  diagram_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_github_username ON users(github_username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_language ON projects(language);
CREATE INDEX idx_projects_trending ON projects(is_trending);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
```

## 3. API Design

### 3.1 API Architecture

**RESTful API Structure:**
- Base URL: `/api`
- Authentication: NextAuth session-based
- Real-time: Socket.io for notifications

### 3.2 Core API Endpoints

#### Authentication
```
POST   /api/auth/signup            - Register new user
POST   /api/auth/signin            - Login user (email/GitHub)
POST   /api/auth/signout           - Logout user
GET    /api/auth/session           - Get current session
```

#### Users
```
GET    /api/users/:id              - Get user profile
PUT    /api/users/:id              - Update user profile
GET    /api/users/:id/posts        - Get user posts
POST   /api/users/:id/follow       - Follow user
DELETE /api/users/:id/follow       - Unfollow user
```

#### Projects
```
GET    /api/projects               - List projects (trending/personalized)
GET    /api/projects/:id           - Get project details
GET    /api/projects/search        - Search projects by domain/tech stack
GET    /api/projects/recommendations - Get personalized recommendations
```

#### Posts (Community Feed)
```
GET    /api/posts                  - Get community feed
POST   /api/posts                  - Create post
GET    /api/posts/:id              - Get post details
PUT    /api/posts/:id              - Update post
DELETE /api/posts/:id              - Delete post
POST   /api/posts/:id/like         - Like post
GET    /api/posts/:id/comments     - Get post comments
POST   /api/posts/:id/comments     - Add comment
```

#### AI Services
```
POST   /api/ai/analyze             - Analyze repository structure
POST   /api/ai/summary             - Generate project summary
POST   /api/ai/explain             - Explain files and folders
POST   /api/ai/diagram             - Generate workflow diagram
POST   /api/ai/tech-stack          - Identify technology stack
```

#### Portfolio
```
GET    /api/portfolio/:slug        - Get public portfolio
POST   /api/portfolio/generate     - Generate portfolio (one-click)
PUT    /api/portfolio              - Update portfolio
POST   /api/portfolio/deploy       - Deploy portfolio
GET    /api/portfolio/templates    - Get available templates
```

#### Integrations
```
POST   /api/integrations/github    - Connect GitHub profile
POST   /api/integrations/linkedin  - Connect LinkedIn profile
POST   /api/integrations/resume    - Upload resume PDF
GET    /api/integrations/data      - Get aggregated data
```

#### Notifications
```
GET    /api/notifications          - Get user notifications
PUT    /api/notifications/:id/read - Mark as read
```

### 3.3 WebSocket Events (Socket.io)

```javascript
// Client → Server
socket.emit('join_feed')
socket.emit('new_post', postData)
socket.emit('new_comment', commentData)
socket.emit('like_post', postId)

// Server → Client
socket.on('post_created', post)
socket.on('comment_added', comment)
socket.on('post_liked', { postId, likesCount })
socket.on('new_notification', notification)
socket.on('new_repository', project)
```

## 4. Component Architecture

### 4.1 Frontend Structure

```
app/
├── (auth)/                       # Authentication routes
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── (dashboard)/                  # Main dashboard
│   ├── layout.tsx
│   ├── page.tsx                  # Dashboard home
│   ├── explore/                  # Project discovery
│   │   └── page.tsx
│   ├── community/                # Community feed
│   │   └── page.tsx
│   ├── projects/                 # User projects
│   │   └── page.tsx
│   └── settings/                 # User settings
│       └── page.tsx
├── portfolio/
│   └── [slug]/                   # Public portfolio
│       └── page.tsx
├── api/                          # API routes
│   ├── auth/
│   ├── users/
│   ├── projects/
│   ├── posts/
│   ├── ai/
│   ├── portfolio/
│   └── notifications/
└── layout.tsx

components/
├── ui/                           # Base UI components
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── ...
├── dashboard/
│   ├── app-sidebar.tsx
│   ├── dashboard-header.tsx
│   └── notification-panel.tsx
├── community/
│   ├── feed-post.tsx
│   ├── post-composer.tsx
│   └── milestone-card.tsx
├── landing/
│   ├── hero.tsx
│   ├── features.tsx
│   └── navbar.tsx
├── portfolio/
│   ├── portfolio-preview.tsx
│   └── portfolio-controls.tsx
└── settings/
    ├── settings-profile.tsx
    ├── settings-integrations.tsx
    └── settings-resume.tsx

lib/
├── prisma.ts                     # Prisma client
├── auth.ts                       # NextAuth config
├── socket.ts                     # Socket.io client
└── utils.ts                      # Utility functions
```

### 4.2 Key Features Implementation

**Real-time Community Feed (Socket.io):**
```javascript
// Server-side (API route)
io.on('connection', (socket) => {
  socket.on('join_feed', () => {
    socket.join('community_feed');
  });
  
  socket.on('new_post', async (postData) => {
    const post = await createPost(postData);
    io.to('community_feed').emit('post_created', post);
  });
});

// Client-side
useEffect(() => {
  socket.on('post_created', (post) => {
    setPosts(prev => [post, ...prev]);
  });
}, []);
```

**AI Project Analysis:**
```javascript
// API route: /api/ai/analyze
export async function POST(req) {
  const { repoUrl } = await req.json();
  
  // Fetch repo structure from GitHub
  const structure = await fetchRepoStructure(repoUrl);
  
  // Analyze with AI
  const analysis = await analyzeWithAI(structure);
  
  // Cache results
  await cacheAnalysis(repoUrl, analysis);
  
  return Response.json(analysis);
}
```

**One-Click Portfolio Generation:**
```javascript
// API route: /api/portfolio/generate
export async function POST(req) {
  const session = await getSession(req);
  
  // Aggregate data from GitHub, LinkedIn, Resume
  const data = await aggregateUserData(session.user.id);
  
  // Generate portfolio with AI
  const portfolio = await generatePortfolio(data);
  
  // Save to database
  await savePortfolio(session.user.id, portfolio);
  
  return Response.json({ 
    success: true, 
    portfolioUrl: `/portfolio/${portfolio.slug}` 
  });
}
```

## 5. AI Integration Design

### 5.1 AI Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI Service Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Project    │  │   Summary    │  │    File      │  │
│  │   Analyzer   │  │  Generator   │  │  Explainer   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │   Diagram    │  │  Tech Stack  │                     │
│  │  Generator   │  │  Identifier  │                     │
│  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   AI Provider (API)                      │
│              (OpenAI / Anthropic / etc.)                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Caching Layer                         │
│                  (Database Cache)                        │
└─────────────────────────────────────────────────────────┘
```

### 5.2 AI Features Implementation

**1. Repository Structure Analysis:**
- Fetch repository file tree from GitHub API
- Identify main directories and their purposes
- Detect configuration files and dependencies
- Generate hierarchical structure visualization

**2. Project Summary Generation:**
- Extract README content
- Analyze package.json/requirements.txt
- Identify main features and functionality
- Generate concise project description

**3. File and Folder Explanation:**
- Parse file contents and structure
- Explain purpose of each major component
- Identify relationships between files
- Provide context for understanding codebase

**4. Workflow and Architecture Diagrams:**
- Analyze code flow and dependencies
- Generate visual representations
- Create architecture diagrams
- Export as images for display

**5. Technology Stack Identification:**
- Detect programming languages
- Identify frameworks and libraries
- List development tools
- Categorize by frontend/backend/database

## 6. Security Design

### 6.1 Authentication Flow

```
User → Login Request → NextAuth → Verify Credentials
                            ↓
                    Create Session
                            ↓
                    Store in Database
                            ↓
                    Return Session Cookie
```

### 6.2 Security Measures

**Authentication:**
- NextAuth for secure authentication
- Session-based authentication with secure cookies
- GitHub OAuth integration
- Email/password with bcrypt hashing

**Authorization:**
- Session validation on protected routes
- User-specific data access control
- API route protection

**Data Protection:**
- HTTPS encryption for all communications
- Encrypted storage for sensitive data
- SQL injection prevention (Prisma ORM)
- XSS protection (React escaping)

**API Security:**
- Session-based authentication
- Input validation
- Rate limiting (future enhancement)

## 7. Performance Optimization

### 7.1 Caching Strategy

**Database-Level:**
- AI analysis results cached in database
- Frequently accessed data optimization

**Application-Level:**
- Next.js automatic static optimization
- Image optimization with Next.js Image
- Code splitting and lazy loading

### 7.2 Database Optimization

- Proper indexing on frequently queried columns
- Efficient query design with Prisma
- Pagination for large datasets

### 7.3 Real-time Optimization

- Socket.io for efficient WebSocket connections
- Event-based updates to minimize polling
- Connection pooling

## 8. Deployment Architecture

### 8.1 AWS Infrastructure

```
┌─────────────────────────────────────────────────────────┐
│                      AWS Cloud                           │
│                                                          │
│  ┌──────────────┐         ┌──────────────┐             │
│  │   EC2        │────────>│   RDS        │             │
│  │  (Next.js)   │         │ (PostgreSQL) │             │
│  └──────────────┘         └──────────────┘             │
│         │                                                │
│         ↓                                                │
│  ┌──────────────┐                                       │
│  │     S3       │                                       │
│  │  (Storage)   │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Deployment Process

1. Code pushed to GitHub repository
2. CI/CD pipeline triggered
3. Build Next.js application
4. Run database migrations
5. Deploy to AWS EC2
6. Update environment variables
7. Restart application server

## 9. Future Enhancements

### 9.1 Planned Features

**Contributor Difficulty Labeling:**
- Automatic difficulty assessment for issues
- Skill-based matching
- Progressive difficulty recommendations

**Mentorship Matching:**
- Connect junior developers with mentors
- Guided contribution programs
- One-on-one support system

**Issue-Level Contribution Guidance:**
- Step-by-step guides for specific issues
- Code examples and templates
- Best practices for each issue type

**Mobile Application:**
- Native iOS and Android apps
- Push notifications
- Offline support

**Admin Moderation Dashboard:**
- Content moderation tools
- User management
- Analytics and reporting

---

This design document provides the technical blueprint for building gitgo. It should be updated as the system evolves and new requirements emerge.
