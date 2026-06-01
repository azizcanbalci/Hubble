import mongoose from "mongoose";

const sentimentResultSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    streamMessageId: { type: String, required: true },
    channelId: { type: String, required: true },
    text: String,
    sentiment: String,
    emoji: String,
    confidence: Number,
    polarity: String,
  },
  { timestamps: true }
);

sentimentResultSchema.index({ userId: 1, channelId: 1 });
sentimentResultSchema.index({ userId: 1, streamMessageId: 1 }, { unique: true });

export const SentimentResult = mongoose.model("SentimentResult", sentimentResultSchema);
