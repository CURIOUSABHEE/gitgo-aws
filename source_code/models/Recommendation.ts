import mongoose, { Schema, Document, Model } from "mongoose"

export interface IRecommendedRepo {
    name: string
    full_name: string
    html_url: string
    description: string
    stars: number
    language: string
    topics: string[]
    whyItFits: string
    whereToStart: string
}

export interface IRecommendationCategory {
    domain: string
    label: string
    repos: IRecommendedRepo[]
}

export interface IRecommendation extends Document {
    userId: mongoose.Types.ObjectId
    githubId: number // ID of the user
    experienceLevel: string
    hasOSSContributions: boolean
    contributionNotes: string
    strengths: string[]
    weaknesses: string[]
    improvements: string[]
    categories: IRecommendationCategory[]
    generatedAt: Date
    isTestProfile: boolean
    testUsername?: string
}

const RecommendedRepoSchema = new Schema<IRecommendedRepo>({
    name: { type: String, required: true },
    full_name: { type: String, required: true },
    html_url: { type: String, required: true },
    description: { type: String, default: "" },
    stars: { type: Number, default: 0 },
    language: { type: String, default: "" },
    topics: [{ type: String }],
    whyItFits: { type: String, required: true },
    whereToStart: { type: String, required: true }
})

const RecommendationCategorySchema = new Schema<IRecommendationCategory>({
    domain: { type: String, required: true },
    label: { type: String, required: true },
    repos: [RecommendedRepoSchema]
})

const RecommendationSchema = new Schema<IRecommendation>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        githubId: { type: Number, index: true },
        experienceLevel: { type: String },
        hasOSSContributions: { type: Boolean },
        contributionNotes: { type: String },
        strengths: [{ type: String }],
        weaknesses: [{ type: String }],
        improvements: [{ type: String }],
        categories: [RecommendationCategorySchema],
        generatedAt: { type: Date, default: Date.now },
        isTestProfile: { type: Boolean, default: false },
        testUsername: { type: String }
    },
    {
        timestamps: true,
    }
)

RecommendationSchema.index({ userId: 1, generatedAt: -1 })
// TTL index to automatically clear test profile generations after 24 hours
RecommendationSchema.index({ generatedAt: 1 }, { expireAfterSeconds: 86400, partialFilterExpression: { isTestProfile: true } })

const Recommendation: Model<IRecommendation> =
    mongoose.models.Recommendation ||
    mongoose.model<IRecommendation>("Recommendation", RecommendationSchema)

export default Recommendation
