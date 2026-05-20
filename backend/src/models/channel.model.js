import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    streamChannelId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    category: {
      type: String,
      default: "general",
      index: true,
    },
    type: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    description: {
      type: String,
      default: "",
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    members: {
      type: [String],
      default: [],
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

channelSchema.index({ category: 1, slug: 1 }, { unique: true });

export const Channel = mongoose.model("Channel", channelSchema);
