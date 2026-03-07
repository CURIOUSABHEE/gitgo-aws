import mongoose from "mongoose"

const GsocOrganizationsSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
      index: true,
    },
    organizations: {
      type: [
        {
          name: String,
          description: String,
          technologies: [String],
          category: String,
          url: String,
          ideas_list: String,
          contact_email: String,
          irc_channel: String,
          topics: [String],
          year: Number,
        },
      ],
      required: true,
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Create a compound index for efficient queries
GsocOrganizationsSchema.index({ year: 1, expiresAt: 1 })

const GsocOrganizations =
  mongoose.models.GsocOrganizations ||
  mongoose.model("GsocOrganizations", GsocOrganizationsSchema)

export default GsocOrganizations
