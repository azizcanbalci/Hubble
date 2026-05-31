import { Channel } from "../models/channel.model.js";

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const createChannel = async (req, res) => {
  try {
    const { name, category = "general", type = "public", description = "", members = [] } =
      req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Channel name is required" });
    }

    const slug = slugify(name);
    if (!slug) {
      return res.status(400).json({ message: "Channel slug could not be generated" });
    }

    const memberIds = Array.from(new Set([req.userId, ...members].filter(Boolean)));

    const channel = await Channel.create({
      name: name.trim(),
      slug,
      category: category.trim().toLowerCase() || "general",
      type,
      description,
      createdBy: req.userId,
      members: memberIds,
    });

    return res.status(201).json({ channel });
  } catch (error) {
    console.error("Error creating channel:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Channel already exists" });
    }
    return res.status(500).json({ message: "Failed to create channel" });
  }
};

export const getMyChannels = async (req, res) => {
  try {
    const channels = await Channel.find({
      members: req.userId,
      archivedAt: null,
    })
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ channels });
  } catch (error) {
    console.error("Error fetching channels:", error);
    return res.status(500).json({ message: "Failed to fetch channels" });
  }
};
