import { axiosInstance } from "./axios";

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}

export async function getChannelMessages(channelId) {
  const response = await axiosInstance.get(`/messages/${channelId}`);
  return response.data;
}
