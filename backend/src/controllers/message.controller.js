import { Message } from "../models/message.model.js";

const normalizeWebhookMessage = (payload) => {
  const message = payload?.message || payload?.data?.message || payload?.data || payload;
  const channel = payload?.channel || payload?.data?.channel || message?.channel || {};
  const user = message?.user || payload?.user || payload?.data?.user || {};

  return {
    streamMessageId: message?.id,
    channelId: channel?.id || message?.cid?.split(":")?.[1] || payload?.cid?.split(":")?.[1],
    channelType: channel?.type || payload?.channel_type || "messaging",
    userId: user?.id || message?.user?.id,
    userName: user?.name || message?.user?.name || "",
    text: message?.text || "",
    attachments: message?.attachments || [],
    rawMessage: message,
  };
};

export const storeStreamMessage = async (req, res) => {
  try {
    const normalized = normalizeWebhookMessage(req.body);

    if (!normalized.streamMessageId || !normalized.channelId || !normalized.userId) {
      return res.status(400).json({ message: "Invalid message payload" });
    }

    const message = await Message.findOneAndUpdate(
      { streamMessageId: normalized.streamMessageId },
      {
        ...normalized,
        deletedAt: null,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ ok: true, messageId: message._id });
  } catch (error) {
    console.error("Error storing stream message:", error);
    return res.status(500).json({ message: "Failed to store message" });
  }
};

export const syncStreamMessageUpdate = async (req, res) => {
  try {
    const normalized = normalizeWebhookMessage(req.body);

    if (!normalized.streamMessageId) {
      return res.status(400).json({ message: "Invalid message payload" });
    }

    const message = await Message.findOneAndUpdate(
      { streamMessageId: normalized.streamMessageId },
      {
        ...normalized,
        deletedAt: null,
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({ ok: true, messageId: message._id });
  } catch (error) {
    console.error("Error syncing stream message update:", error);
    return res.status(500).json({ message: "Failed to sync message update" });
  }
};

export const markStreamMessageDeleted = async (req, res) => {
  try {
    const normalized = normalizeWebhookMessage(req.body);

    if (!normalized.streamMessageId) {
      return res.status(400).json({ message: "Invalid message payload" });
    }

    await Message.findOneAndUpdate(
      { streamMessageId: normalized.streamMessageId },
      { deletedAt: new Date() }
    );

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error marking stream message deleted:", error);
    return res.status(500).json({ message: "Failed to mark message deleted" });
  }
};

export const getMessagesByChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);
    const before = req.query.before;

    const query = {
      channelId,
      deletedAt: null,
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ messages: messages.reverse() });
  } catch (error) {
    console.error("Error fetching channel messages:", error);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
};
