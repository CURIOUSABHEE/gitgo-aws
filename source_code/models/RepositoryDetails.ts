import mongoose, { Schema, Document, Model } from "mongoose"

export interface IRepositoryDetails extends Document {
  owner: string
  repoName: string
  fullName: string
  repository: {
    name: string
    full_name: string
    description: string
    html_url: string
    clone_url: string
    ssh_url: string
    homepage: string | null
    language: string
    stargazers_count: number
    forks_count: number
    open_issues_count: number
    watchers_count: number
    default_branch: string
    created_at: string
    updated_at: string
    topics: string[]
    license: { name: string } | null
  }
  readme: string | null
  fileStructure: Array<{ path: string; type: string }> | null
  deploymentInfo: { hasDeployment: boolean; deploymentFile: string } | null
  cachedAt: Date
  lastFetchedAt: Date
}

const RepositoryDetailsSchema = new Schema<IRepositoryDetails>(
  {
    owner: { type: String, required: true, index: true },
    repoName: { type: String, required: true, index: true },
    fullName: { type: String, required: true, unique: true, index: true },
    repository: {
      name: { type: String, required: true },
      full_name: { type: String, required: true },
      description: { type: String },
      html_url: { type: String, required: true },
      clone_url: { type: String, required: true },
      ssh_url: { type: String, required: true },
      homepage: { type: String },
      language: { type: String },
      stargazers_count: { type: Number, default: 0 },
      forks_count: { type: Number, default: 0 },
      open_issues_count: { type: Number, default: 0 },
      watchers_count: { type: Number, default: 0 },
      default_branch: { type: String, default: "main" },
      created_at: { type: String },
      updated_at: { type: String },
      topics: [{ type: String }],
      license: {
        name: { type: String },
      },
    },
    readme: { type: String },
    fileStructure: [
      {
        path: { type: String },
        type: { type: String },
      },
    ],
    deploymentInfo: {
      hasDeployment: { type: Boolean, default: false },
      deploymentFile: { type: String },
    },
    cachedAt: { type: Date, default: Date.now },
    lastFetchedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
)

// Compound index for faster lookups
RepositoryDetailsSchema.index({ owner: 1, repoName: 1 })

// Prevent model recompilation in development
const RepositoryDetails: Model<IRepositoryDetails> =
  mongoose.models.RepositoryDetails ||
  mongoose.model<IRepositoryDetails>("RepositoryDetails", RepositoryDetailsSchema)

export default RepositoryDetails
