import mongoose, { Schema, Document, Model } from "mongoose"

export interface IPost extends Document {
  userId: mongoose.Types.ObjectId
  author: {
    githubId: string
    login: string
    name: string
    avatar_url: string
  }
  content: string
  type: "post" | "milestone" | "achievement"
  milestone?: {
    title: string
    description: string
    icon: string
  }
  likes: string[] // Array of githubIds who liked
  comments: Array<{
    userId: string
    author: {
      login: string
      name: string
      avatar_url: string
    }
    content: string
    createdAt: Date
  }>
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

const PostSchema = new Schema<IPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    author: {
      githubId: { type: String, required: true },
      login: { type: String, required: true },
      name: { type: String, required: true },
      avatar_url: { type: String, default: "" },
    },
    content: { type: String, required: true },
    type: { type: String, enum: ["post", "milestone", "achievement"], default: "post" },
    milestone: {
      title: { type: String },
      description: { type: String },
      icon: { type: String },
    },
    likes: [{ type: String }], // githubIds
    comments: [
      {
        userId: { type: String, required: true },
        author: {
          login: { type: String, required: true },
          name: { type: String, required: true },
          avatar_url: { type: String, default: "" },
        },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    tags: [{ type: String }],
  },
  {
    timestamps: true,
  }
)

// Index for efficient queries
PostSchema.index({ createdAt: -1 })
PostSchema.index({ userId: 1, createdAt: -1 })

const Post: Model<IPost> =
  mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema)

export default Post
