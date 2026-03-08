import mongoose, { Schema, Document, Model } from "mongoose"

export interface IRepository extends Document {
  githubId: number
  userId: mongoose.Types.ObjectId
  name: string
  full_name: string
  description: string
  html_url: string
  language: string
  stargazers_count: number
  forks_count: number
  watchers_count: number
  open_issues_count: number
  topics: string[]
  created_at: Date
  updated_at: Date
  pushed_at: Date
  size: number
  default_branch: string
  owner: {
    login: string
    avatar_url: string
  }
  private: boolean
  fork: boolean
  archived: boolean
  disabled: boolean
  lastSynced: Date
}

const RepositorySchema = new Schema<IRepository>(
  {
    githubId: { type: Number, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    full_name: { type: String, required: true },
    description: { type: String, default: "" },
    html_url: { type: String, required: true },
    language: { type: String, default: "" },
    stargazers_count: { type: Number, default: 0 },
    forks_count: { type: Number, default: 0 },
    watchers_count: { type: Number, default: 0 },
    open_issues_count: { type: Number, default: 0 },
    topics: [{ type: String }],
    created_at: { type: Date },
    updated_at: { type: Date },
    pushed_at: { type: Date },
    size: { type: Number, default: 0 },
    default_branch: { type: String, default: "main" },
    owner: {
      login: { type: String, required: true },
      avatar_url: { type: String, default: "" },
    },
    private: { type: Boolean, default: false },
    fork: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    lastSynced: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
)

// Compound index for efficient queries
RepositorySchema.index({ userId: 1, updated_at: -1 })

const Repository: Model<IRepository> =
  mongoose.models.Repository ||
  mongoose.model<IRepository>("Repository", RepositorySchema)

export default Repository
