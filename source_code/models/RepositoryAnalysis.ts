/**
 * Mongoose model: RepositoryAnalysis
 * Stores the complete analysis payload including GitHub data and LLM output.
 * repoUrl is a unique index — used for cache lookups.
 */
import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const CommitSchema = new Schema(
    {
        sha: String,
        message: String,
        author: String,
        date: String,
        url: String,
    },
    { _id: false }
);

const ContributorSchema = new Schema(
    {
        login: String,
        avatar_url: String,
        html_url: String,
        contributions: Number,
    },
    { _id: false }
);

const KeyFileSchema = new Schema(
    {
        path: String,
        content: String,
    },
    { _id: false }
);

const RouteSchema = new Schema(
    {
        path: String,
        method: String,
        functionality: String,
        contribution: String,
        lifecycleRole: String,
    },
    { _id: false }
);

const LLMAnalysisSchema = new Schema(
    {
        overallFlow: String,
        architectureJson: { type: Schema.Types.Mixed },
        routes: [RouteSchema],
    },
    { _id: false }
);

// Stores the per-route deep analysis result so repeat views are instant
// Using an array (not Map) so MongoDB dot-notation writes with slash/dash keys never break
const RouteAnalysisCacheEntrySchema = new Schema(
    {
        route: { type: String, required: true },   // e.g. "/smart-cultivation"
        flowVisualization: String,
        executionTrace: String,
        cachedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const RepoMetadataSchema = new Schema(
    {
        fullName: String,
        description: String,
        language: String,
        stars: Number,
        forks: Number,
        watchers: Number,
        defaultBranch: String,
        homepage: String,
        topics: [String],
        createdAt: String,
        updatedAt: String,
        pushedAt: String,
        size: Number,
        isPrivate: Boolean,
        license: { type: Schema.Types.Mixed },
    },
    { _id: false }
);

const RepoStatusSchema = new Schema(
    {
        openIssues: Number,
        closedIssues: Number,
        openPRs: Number,
        closedPRs: Number,
        totalDeployments: Number,
    },
    { _id: false }
);



// ─── Main document ────────────────────────────────────────────────────────────

export interface IRepositoryAnalysis extends Document {
    repoUrl: string;
    owner: string;
    repoName: string;
    metadata: Record<string, unknown>;
    commits: {
        total: number;
        recent: unknown[];
    };
    contributors: unknown[];
    repoStatus: Record<string, unknown>;
    techStack: Record<string, unknown>;
    fileTree: string;
    keyFileContents: unknown[];
    llmAnalysis: {
        overallFlow: string;
        architectureJson: Record<string, unknown>;
        routes: unknown[];
    };
    analyzedAt: Date;
    routeAnalysisCache: Array<{
        route: string;
        flowVisualization: string;
        executionTrace: string;
        cachedAt: Date;
    }>;
    // Usage tracking fields
    viewCount: number;
    lastViewedAt: Date;
    viewHistory: Array<{
        userId: string;
        viewedAt: Date;
        userAgent?: string;
    }>;
    isCached: boolean;
    cacheReason?: string;
    cachePriority: number;
    // User-specific tracking
    viewedByUsers: string[];
    uniqueViewCount: number;
}

const ViewHistorySchema = new Schema(
    {
        userId: { type: String, required: true },
        viewedAt: { type: Date, default: Date.now },
        userAgent: String,
    },
    { _id: false }
);

const RepositoryAnalysisSchema = new Schema<IRepositoryAnalysis>(
    {
        repoUrl: { type: String, required: true, unique: true, index: true },
        owner: { type: String, required: true, index: true },
        repoName: { type: String, required: true, index: true },
        metadata: { type: RepoMetadataSchema },
        commits: {
            total: Number,
            recent: [CommitSchema],
        },
        contributors: [ContributorSchema],
        repoStatus: { type: RepoStatusSchema },
        techStack: { type: Schema.Types.Mixed },
        fileTree: { type: String }, // JSON-stringified file tree
        keyFileContents: [KeyFileSchema],
        llmAnalysis: { type: LLMAnalysisSchema },
        analyzedAt: { type: Date, default: Date.now },
        // Array of per-route deep-analysis results (array avoids MongoDB dot-notation key issues)
        routeAnalysisCache: {
            type: [RouteAnalysisCacheEntrySchema],
            default: [],
        },
        // Usage tracking fields
        viewCount: { type: Number, default: 0, index: true },
        lastViewedAt: { type: Date, default: Date.now, index: true },
        viewHistory: {
            type: [ViewHistorySchema],
            default: [],
        },
        isCached: { type: Boolean, default: false, index: true },
        cacheReason: { type: String },
        cachePriority: { type: Number, default: 0, index: true },
        // User-specific tracking
        viewedByUsers: { type: [String], default: [] },
        uniqueViewCount: { type: Number, default: 0, index: true },
    },
    { timestamps: true }
);

// Compound indexes for efficient queries
RepositoryAnalysisSchema.index({ viewCount: -1, lastViewedAt: -1 });
RepositoryAnalysisSchema.index({ isCached: 1, cachePriority: -1 });
RepositoryAnalysisSchema.index({ owner: 1, repoName: 1 });

export const RepositoryAnalysis: Model<IRepositoryAnalysis> =
    mongoose.models.RepositoryAnalysis ||
    mongoose.model<IRepositoryAnalysis>("RepositoryAnalysis", RepositoryAnalysisSchema);
