import mongoose from "mongoose"

const NotificationSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["new_post", "post_like", "post_comment", "milestone", "achievement"],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        link: {
            type: String,
            default: null,
        },
        read: {
            type: Boolean,
            default: false,
            index: true,
        },
        metadata: {
            postId: String,
            authorId: String,
            authorName: String,
            authorAvatar: String,
        },
    },
    {
        timestamps: true,
    }
)

// Compound index for efficient queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 })

const Notification =
    mongoose.models.Notification ||
    mongoose.model("Notification", NotificationSchema)

export default Notification
