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
      default: "",
    },
    clerkId: {
      type: String,
      sparse: true,
      unique: true,
    },
    password: {
      type: String,
    },
    authProvider: {
      type: String,
      enum: ["clerk", "local"],
      default: "clerk",
    },
    settings: {
      sentimentAnalysisEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
