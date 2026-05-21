import { axiosInstance } from "./axios";

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}

export async function getChannelMessages(channelId) {
  const response = await axiosInstance.get(`/messages/${channelId}`);
  return response.data;
}

export async function searchChannelMessages(channelId, query) {
  const response = await axiosInstance.get(`/messages/${channelId}/search`, {
    params: { q: query },
  });
  return response.data;
}

export async function syncMessageToMongo(messagePayload) {
  const response = await axiosInstance.post("/messages/sync", messagePayload);
  return response.data;
}

export async function analyzeMessages(messages, channelId) {
  const response = await axiosInstance.post("/messages/analyze", { messages, channelId });
  return response.data;
}

export async function getSentimentsForChannel(channelId) {
  const response = await axiosInstance.get(`/messages/${channelId}/sentiments`);
  return response.data;
}

export async function getUserSettings() {
  const response = await axiosInstance.get("/chat/settings");
  return response.data;
}

export async function updateUserSettings(settings) {
  const response = await axiosInstance.patch("/chat/settings", { settings });
  return response.data;
}
