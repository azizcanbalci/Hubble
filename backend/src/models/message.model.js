import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    streamMessageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    channelId: {
      type: String,
      required: true,
      index: true,
    },
    channelType: {
      type: String,
      default: "messaging",
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      default: "",
    },
    text: {
      type: String,
      default: "",
    },
    attachments: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    rawMessage: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

messageSchema.index({ channelId: 1, createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema);
