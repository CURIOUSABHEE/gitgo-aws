import mongoose from "mongoose"

const ContributorFriendlyRepoSchema = new mongoose.Schema(
  {
    // GitHub repo identifiers
    githubId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    htmlUrl: {
      type: String,
      required: true,
    },

    // Repository metadata
    language: {
      type: String,
      default: null,
      index: true,
    },
    topics: {
      type: [String],
      default: [],
      index: true,
    },
    
    // Statistics
    stargazersCount: {
      type: Number,
      default: 0,
      index: true,
    },
    openIssuesCount: {
      type: Number,
      default: 0,
    },
    forksCount: {
      type: Number,
      default: 0,
    },
    lastPushedAt: {
      type: Date,
      required: true,
      index: true,
    },

    // Contributor-friendly indicators
    hasContributingFile: {
      type: Boolean,
      default: false,
    },
    hasCI: {
      type: Boolean,
      default: false,
    },
    licenseName: {
      type: String,
      default: null,
    },
    goodFirstIssueCount: {
      type: Number,
      default: 0,
      index: true,
    },
    helpWantedCount: {
      type: Number,
      default: 0,
    },

    // Quality score (0-100)
    qualityScore: {
      type: Number,
      required: true,
      index: true,
    },

    // Data source
    source: {
      type: String,
      enum: ["github", "goodfirstissue", "upforgrabs"],
      default: "github",
    },

    // Sync metadata
    lastSyncedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    syncStatus: {
      type: String,
      enum: ["active", "archived", "deleted"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
)

// Compound indexes for efficient queries
ContributorFriendlyRepoSchema.index({ qualityScore: -1, stargazersCount: -1 })
ContributorFriendlyRepoSchema.index({ language: 1, qualityScore: -1 })
ContributorFriendlyRepoSchema.index({ goodFirstIssueCount: -1, qualityScore: -1 })
ContributorFriendlyRepoSchema.index({ lastPushedAt: -1, qualityScore: -1 })

const ContributorFriendlyRepo =
  mongoose.models.ContributorFriendlyRepo ||
  mongoose.model("ContributorFriendlyRepo", ContributorFriendlyRepoSchema)

export default ContributorFriendlyRepo
