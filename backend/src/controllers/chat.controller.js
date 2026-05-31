import { isValidObjectId } from "mongoose";
import { generateStreamToken } from "../config/stream.js";
import { User } from "../models/user.model.js";

const userFilter = (userId) =>
  isValidObjectId(userId) ? { _id: userId } : { clerkId: userId };

export const getStreamToken = async (req, res) => {
  try {
    const token = generateStreamToken(req.userId);
    res.status(200).json({ token });
  } catch (error) {
    console.log("Error generating Stream token:", error);
    res.status(500).json({
      message: "Failed to generate Stream token",
    });
  }
};

export const getUserSettings = async (req, res) => {
  try {
    const user = await User.findOne(userFilter(req.userId)).select("settings").lean();
    const settings = user?.settings ?? { sentimentAnalysisEnabled: true };
    return res.status(200).json({ settings });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return res.status(500).json({ message: "Failed to fetch settings" });
  }
};

export const updateUserSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    // Dot notation to avoid overwriting unrelated settings fields
    const updateDoc = {};
    for (const [key, value] of Object.entries(settings)) {
      updateDoc[`settings.${key}`] = value;
    }

    const user = await User.findOneAndUpdate(
      userFilter(req.userId),
      { $set: updateDoc },
      { new: true }
    ).select("settings");

    return res.status(200).json({ settings: user.settings });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return res.status(500).json({ message: "Failed to update settings" });
  }
};
