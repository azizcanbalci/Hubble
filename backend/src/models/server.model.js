import mongoose from "mongoose";

const serverSchema = new mongoose.Schema(
  {
    serverId: { type: String, unique: true, required: true, index: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: null },
    ownerId: { type: String, required: true },
    members: [
      {
        userId: { type: String, required: true },
        role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
      },
    ],
    inviteCodes: [
      {
        code: { type: String, required: true },
        createdBy: { type: String },
        expiresAt: { type: Date, default: null },
      },
    ],
  },
  { timestamps: true }
);

export const Server = mongoose.model("Server", serverSchema);
