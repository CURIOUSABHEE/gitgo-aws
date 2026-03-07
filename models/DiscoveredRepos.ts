import mongoose, { Schema, Document, Model } from "mongoose"

export interface IDiscoveredRepos extends Document {
  userId: string
  languages: string[]
  repos: Array<{
    name: string
    owner: string
    description: string
    stars: number
    forks: number
    language: string
    languageColor: string
    topics: string[]
    openIssues: number
    htmlUrl: string
    goodFirstIssues?: number
  }>
  lastFetchedAt: Date
  createdAt: Date
  updatedAt: Date
}

const DiscoveredReposSchema = new Schema<IDiscoveredRepos>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    languages: [{ type: String }],
    repos: [
      {
        name: { type: String, required: true },
        owner: { type: String, required: true },
        description: { type: String },
        stars: { type: Number, default: 0 },
        forks: { type: Number, default: 0 },
        language: { type: String },
        languageColor: { type: String },
        topics: [{ type: String }],
        openIssues: { type: Number, default: 0 },
        htmlUrl: { type: String },
        goodFirstIssues: { type: Number, default: 0 },
      },
    ],
    lastFetchedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
)

// Index for efficient queries
DiscoveredReposSchema.index({ userId: 1, lastFetchedAt: -1 })

const DiscoveredRepos: Model<IDiscoveredRepos> =
  mongoose.models.DiscoveredRepos ||
  mongoose.model<IDiscoveredRepos>("DiscoveredRepos", DiscoveredReposSchema)

export default DiscoveredRepos
