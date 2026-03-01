import mongoose, { Schema, Document, Model } from "mongoose"

export interface IPortfolio extends Document {
  userId: string
  username: string
  subdomain: string // e.g., "johndoe" for johndoe.gitgo.dev
  isPublished: boolean
  customDomain?: string
  theme: "minimal" | "creative" | "professional" | "student"

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
      enum: ["default", "minimal", "modern", "dark"],
      default: "default",
    },
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
