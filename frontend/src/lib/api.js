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
