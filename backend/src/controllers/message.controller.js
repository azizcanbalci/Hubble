import { Message } from "../models/message.model.js";
import { SentimentResult } from "../models/sentiment.model.js";

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

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const analyzeMessages = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { messages, channelId } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "messages array is required" });
    }

    const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";

    const results = await Promise.all(
      messages.map(async ({ id, text }) => {
        const response = await fetch(`${ML_API_URL}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) throw new Error(`ML API error: ${response.status}`);

        const data = await response.json();
        const result = data.results[0];

        // Preserve the original Stream message id — ML API returns its own UUID
        // which would overwrite ours if spread directly
        return {
          id,
          text: result.text,
          sentiment: result.sentiment,
          emoji: result.emoji,
          confidence: result.confidence,
        };
      })
    );

    // Persist per-user sentiment results
    await SentimentResult.bulkWrite(
      results.map((r) => ({
        updateOne: {
          filter: { userId, streamMessageId: r.id },
          update: {
            $set: {
              userId,
              streamMessageId: r.id,
              channelId: channelId || "",
              text: r.text,
              sentiment: r.sentiment,
              emoji: r.emoji,
              confidence: r.confidence,
            },
          },
          upsert: true,
        },
      }))
    );

    return res.status(200).json({ results });
  } catch (error) {
    console.error("Error analyzing messages:", error);
    return res.status(500).json({ message: "Failed to analyze messages" });
  }
};

export const getSentimentsForChannel = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { channelId } = req.params;

    const sentiments = await SentimentResult.find({ userId })
      .select("streamMessageId sentiment emoji confidence")
      .lean();

    return res.status(200).json({ sentiments });
  } catch (error) {
    console.error("Error fetching sentiments:", error);
    return res.status(500).json({ message: "Failed to fetch sentiments" });
  }
};

export const searchMessagesInChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const queryText = (req.query.q || "").trim();

    if (!queryText) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const terms = Array.from(
      new Set(
        queryText
          .split(/\s+/)
          .map((term) => term.trim())
          .filter(Boolean)
      )
    ).slice(0, 8);

    const termRegexes = terms.map((term) => escapeRegex(term));
    const phraseRegex = escapeRegex(queryText);

    const scoreExpressions = [
      {
        $cond: [{ $regexMatch: { input: "$text", regex: phraseRegex, options: "i" } }, 8, 0],
      },
      ...termRegexes.map((regex) => ({
        $cond: [{ $regexMatch: { input: "$text", regex, options: "i" } }, 2, 0],
      })),
    ];

    const messages = await Message.aggregate([
      {
        $match: {
          channelId,
          deletedAt: null,
          text: { $type: "string", $ne: "" },
        },
      },
      {
        $addFields: {
          score: {
            $add: scoreExpressions,
          },
        },
      },
      {
        $match: {
          score: { $gt: 0 },
        },
      },
      {
        $sort: {
          score: -1,
          createdAt: -1,
        },
      },
      {
        $limit: 30,
      },
      {
        $project: {
          _id: 1,
          streamMessageId: 1,
          userId: 1,
          userName: 1,
          text: 1,
          createdAt: 1,
          score: 1,
        },
      },
    ]);

    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Error searching channel messages:", error);
    return res.status(500).json({ message: "Failed to search channel messages" });
  }
};
