import mongoose, { Schema, Document, Model } from "mongoose"

export interface IPortfolio extends Document {
  userId: string
  username: string
  subdomain: string
  isPublished: boolean
  customDomain?: string
  theme: "minimal" | "creative" | "professional" | "student" | "modern"

  // Profile data from MongoDB
  profile: {
    name: string
    bio: string
    tagline: string
    avatar?: string
    location?: string
    email?: string
  }

  // Selected GitHub repos to display
  selectedRepos: Array<{
    repoId: number
    repoName: string
    repoFullName: string
  }>

  sections: {
    about: boolean
    skills: boolean
    projects: boolean
    experience: boolean
    education: boolean
    contributions: boolean
  }
  socialLinks: {
    github?: string
    linkedin?: string
    twitter?: string
    website?: string
    email?: string
  }
  analytics: {
    views: number
    lastViewedAt?: Date
  }
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

const PortfolioSchema = new Schema<IPortfolio>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    subdomain: { type: String, required: true, unique: true, index: true },
    isPublished: { type: Boolean, default: false },
    customDomain: { type: String },
    theme: {
      type: String,
      enum: ["minimal", "creative", "professional", "student", "modern"],
      default: "minimal",
    },
    profile: {
      name: { type: String, default: "" },
      bio: { type: String, default: "" },
      tagline: { type: String, default: "" },
      avatar: { type: String },
      location: { type: String },
      email: { type: String },
    },
    selectedRepos: [
      {
        repoId: { type: Number, required: true },
        repoName: { type: String, required: true },
        repoFullName: { type: String, required: true },
      },
    ],
    sections: {
      about: { type: Boolean, default: true },
      skills: { type: Boolean, default: true },
      projects: { type: Boolean, default: true },
      experience: { type: Boolean, default: true },
      education: { type: Boolean, default: true },
      contributions: { type: Boolean, default: true },
    },
    socialLinks: {
      github: { type: String },
      linkedin: { type: String },
      twitter: { type: String },
      website: { type: String },
      email: { type: String },
    },
    analytics: {
      views: { type: Number, default: 0 },
      lastViewedAt: { type: Date },
    },
    publishedAt: { type: Date },
  },
  {
    timestamps: true,
  }
)

// Indexes for efficient queries
PortfolioSchema.index({ subdomain: 1 })
PortfolioSchema.index({ isPublished: 1 })

const Portfolio: Model<IPortfolio> =
  mongoose.models.Portfolio ||
  mongoose.model<IPortfolio>("Portfolio", PortfolioSchema)

export default Portfolio
