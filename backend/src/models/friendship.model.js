import mongoose from "mongoose";

const friendshipSchema = new mongoose.Schema(
  {
    senderId:   { type: String, required: true, index: true },
    receiverId: { type: String, required: true, index: true },
    status:     { type: String, enum: ["pending", "accepted"], default: "pending" },
  },
  { timestamps: true }
);

friendshipSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

export const Friendship = mongoose.model("Friendship", friendshipSchema);
