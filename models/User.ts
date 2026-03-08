import mongoose, { Schema, Document, Model } from "mongoose"

export interface IUser extends Document {
  githubId: string
  login: string
  name: string
  email: string
  avatar_url: string
  bio: string
  title: string
  location: string
  blog: string
  company: string
  twitter_username: string
  hireable: boolean
  public_repos: number
  followers: number
  following: number
  created_at: Date
  updated_at: Date
  lastSynced: Date
  // New fields for skills and languages
  languages: string[]
  skills: string[]
  techStack: string[]
  // Technology map: tracks which technologies were used in which projects
  technologyMap: {
    technology: string
    projects: Array<{
      repoName: string
      repoId: number
      isPrimary: boolean // true if it's the main language of the repo
      lastUsed: Date
    }>
    totalProjects: number
    firstUsed: Date
    lastUsed: Date
  }[]
  // LinkedIn integration fields
  linkedinId?: string
  linkedinAccessToken?: string
  linkedinRefreshToken?: string
  linkedinTokenExpiry?: Date
  linkedinProfile?: {
    headline: string
    summary: string
    industry: string
    profilePicture: string
  }
  linkedinExperience?: Array<{
    company: string
    title: string
    startDate: Date
    endDate?: Date
    description: string
    location: string
    current: boolean
  }>
  linkedinEducation?: Array<{
    school: string
    degree: string
    fieldOfStudy: string
    startDate: Date
    endDate?: Date
    description: string
  }>
  linkedinSkills?: string[]
  linkedinLastSynced?: Date
  linkedin?: {
    url: string
    fetchedAt: Date
  }
  // Subscription fields
  subscriptionPlan?: "free" | "starter" | "pro" | "enterprise"
  subscriptionStatus?: "active" | "cancelled" | "expired" | "trial"
  subscriptionStartDate?: Date
  subscriptionEndDate?: Date
  subscriptionId?: string // Razorpay subscription ID
  paymentId?: string // Razorpay payment ID
  routeAnalysisCount?: number // Daily route analysis count
  routeAnalysisResetDate?: Date // When to reset the count
  // Resume Parsing Fields
  resumeFileName?: string
  resumeUploadedAt?: Date
  resumeS3Key?: string // S3 object key for the PDF file
  resumeName?: string // Extracted name from resume
  resumeEmail?: string // Extracted email from resume
  resumePhone?: string // Extracted phone from resume
  resumeLocation?: string // Extracted location from resume
  resumeCareerObjective?: string
  resumeSkillGroups?: any[] // Simplified typing for schema
  resumeExperience?: any[]
  resumeEducation?: any[]
  resumeProjects?: any[]
  resumeCertifications?: string[] // Extracted certifications
  resumeRawText?: string
}

const UserSchema = new Schema<IUser>(
  {
    githubId: { type: String, required: true, unique: true, index: true },
    login: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    avatar_url: { type: String, default: "" },
    bio: { type: String, default: "" },
    title: { type: String, default: "" },
    location: { type: String, default: "" },
    blog: { type: String, default: "" },
    company: { type: String, default: "" },
    twitter_username: { type: String, default: "" },
    hireable: { type: Boolean, default: false },
    public_repos: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    created_at: { type: Date },
    lastSynced: { type: Date, default: Date.now },
    // New fields
    languages: [{ type: String }],
    skills: [{ type: String }],
    techStack: [{ type: String }],
    // Technology map
    technologyMap: [
      {
        technology: { type: String, required: true },
        projects: [
          {
            repoName: { type: String, required: true },
            repoId: { type: Number, required: true },
            isPrimary: { type: Boolean, default: false },
            lastUsed: { type: Date, default: Date.now },
          },
        ],
        totalProjects: { type: Number, default: 0 },
        firstUsed: { type: Date, default: Date.now },
        lastUsed: { type: Date, default: Date.now },
      },
    ],
    // LinkedIn integration fields
    linkedinId: { type: String, sparse: true, index: true },
    linkedinAccessToken: { type: String },
    linkedinRefreshToken: { type: String },
    linkedinTokenExpiry: { type: Date },
    linkedinProfile: {
      headline: { type: String },
      summary: { type: String },
      industry: { type: String },
      profilePicture: { type: String },
    },
    linkedinExperience: [
      {
        company: { type: String },
        title: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        description: { type: String },
        location: { type: String },
        current: { type: Boolean, default: false },
      },
    ],
    linkedinEducation: [
      {
        school: { type: String },
        degree: { type: String },
        fieldOfStudy: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        description: { type: String },
      },
    ],
    linkedinSkills: [{ type: String }],
    linkedinLastSynced: { type: Date },
    linkedin: {
      url: { type: String },
      fetchedAt: { type: Date },
    },
    // Subscription fields
    subscriptionPlan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      default: "free",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "cancelled", "expired", "trial"],
      default: "active",
    },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date },
    subscriptionId: { type: String },
    paymentId: { type: String },
    routeAnalysisCount: { type: Number, default: 0 },
    routeAnalysisResetDate: { type: Date, default: Date.now },
    // Resume Fields
    resumeFileName: { type: String },
    resumeUploadedAt: { type: Date },
    resumeS3Key: { type: String }, // S3 object key
    resumeName: { type: String }, // Extracted name
    resumeEmail: { type: String }, // Extracted email
    resumePhone: { type: String }, // Extracted phone
    resumeLocation: { type: String }, // Extracted location
    resumeCareerObjective: { type: String },
    resumeSkillGroups: [{ type: Schema.Types.Mixed }],
    resumeExperience: [{ type: Schema.Types.Mixed }],
    resumeEducation: [{ type: Schema.Types.Mixed }],
    resumeProjects: [{ type: Schema.Types.Mixed }],
    resumeCertifications: [{ type: String }], // Extracted certifications
    resumeRawText: { type: String },
  },
  {
    timestamps: true,
  }
)

// Prevent model recompilation in development
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema)

export default User
