import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    settings: {
      sentimentAnalysisEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
