import { streamClient, getVideoClient } from "../config/stream.js";

export const getCallRecordings = async (req, res) => {
  try {
    const { callId } = req.params;
    const { userId } = req.auth();

    const channels = await streamClient.queryChannels(
      { id: { $eq: callId }, members: { $in: [userId] } },
      {},
      { limit: 1 }
    );
    if (!channels.length) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const videoClient = getVideoClient();
    const { recordings } = await videoClient.video.call("default", callId).listRecordings();

    return res.status(200).json({ recordings });
  } catch (error) {
    console.error("Error fetching call recordings:", error);
    return res.status(500).json({ message: "Failed to fetch recordings" });
  }
};
