# GitGo - Open Source Contribution Platform

A Next.js application that helps developers discover and contribute to open-source projects matching their skills and interests.

## Features

- 🔍 **Smart Repository Discovery** - AI-powered recommendations based on your tech stack
- 📊 **Repository Analysis** - Deep insights into project architecture and contribution opportunities
- 🎯 **GSoC Integration** - Browse Google Summer of Code organizations
- 👤 **Developer Portfolio** - Generate and customize your developer portfolio
- 🤝 **Community Feed** - Connect with other developers and share achievements
- 📈 **Analytics Dashboard** - Track your open-source contributions

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB
- **Authentication**: NextAuth.js (GitHub OAuth)
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Groq API for intelligent analysis
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB database
- GitHub OAuth App credentials
- Groq API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/CURIOUSABHEE/gitgo.git
cd gitgo/source_code
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- `MONGODB_URI`
- `GROQ_API_KEY`
- `NEXTAUTH_SECRET`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
source_code/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── (auth)/            # Authentication pages
├── components/            # React components
│   ├── dashboard/        # Dashboard-specific components
│   ├── settings/         # Settings components
│   └── ui/               # Reusable UI components
├── lib/                   # Utility functions
├── models/               # MongoDB models
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── styles/               # Global styles
```

## Key Features

### Repository Discovery
- Browse curated open-source repositories
- Filter by programming language
- Search for good first issues
- View repository details and contribution guides

### Smart Matches
- AI-powered repository recommendations
- Personalized based on your GitHub profile
- Analyzes your skills and suggests matching projects

### Repository Analysis
- Deep code analysis with architecture diagrams
- Route analysis and API documentation
- Contribution difficulty assessment
- Technology stack breakdown

### Developer Portfolio
- Auto-generated from GitHub data
- Multiple professional templates
- Customizable themes and layouts
- Export and share capabilities

## Environment Variables

Required environment variables:

```env
# Authentication
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_TOKEN=your_github_personal_access_token
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Database
MONGODB_URI=your_mongodb_connection_string

# AI Services
GROQ_API_KEY=your_groq_api_key

# Optional
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
CRON_SECRET=your_cron_secret
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- AI powered by [Groq](https://groq.com/)
