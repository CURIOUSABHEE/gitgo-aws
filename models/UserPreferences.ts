import mongoose, { Schema, Document, Model } from "mongoose"

export interface IUserPreferences extends Document {
  userId: string // githubId
  emailNotifications: {
    newMatches: boolean
    weeklyDigest: boolean
    socialActivity: boolean
    prUpdates: boolean
  }
  pushNotifications: {
    highPriorityMatches: boolean
    mentions: boolean
    milestones: boolean
  }
  updatedAt: Date
}

const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    emailNotifications: {
      newMatches: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true },
      socialActivity: { type: Boolean, default: false },
      prUpdates: { type: Boolean, default: true },
    },
    pushNotifications: {
      highPriorityMatches: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      milestones: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
)

const UserPreferences: Model<IUserPreferences> =
  mongoose.models.UserPreferences ||
  mongoose.model<IUserPreferences>("UserPreferences", UserPreferencesSchema)

export default UserPreferences
