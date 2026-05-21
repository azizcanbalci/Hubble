import { generateStreamToken } from "../config/stream.js";
import { User } from "../models/user.model.js";

export const getStreamToken = async (req, res) => {
  try {
    const token = generateStreamToken(req.auth().userId);
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
    const { userId } = req.auth();
    const user = await User.findOne({ clerkId: userId }).select("settings").lean();
    const settings = user?.settings ?? { sentimentAnalysisEnabled: true };
    return res.status(200).json({ settings });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return res.status(500).json({ message: "Failed to fetch settings" });
  }
};

export const updateUserSettings = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { settings } = req.body;

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      { $set: { settings } },
      { new: true }
    ).select("settings");

    return res.status(200).json({ settings: user.settings });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return res.status(500).json({ message: "Failed to update settings" });
  }
};
