import { axiosInstance } from "./axios";

export async function registerUser(name, email, password) {
  const response = await axiosInstance.post("/auth/register", { name, email, password });
  return response.data;
}

export async function loginUser(email, password) {
  const response = await axiosInstance.post("/auth/login", { email, password });
  return response.data;
}

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

export async function updateProfile(name, image) {
  const response = await axiosInstance.patch("/auth/profile", { name, image });
  return response.data;
}

export async function getCallRecordings(callId) {
  const response = await axiosInstance.get(`/video/recordings/${callId}`);
  return response.data;
}

export async function analyzeRecording(callId, url, meetingDate) {
  const response = await axiosInstance.post(`/video/analyze/${callId}`, { url, meetingDate });
  return response.data;
}

export async function getCallAnalyses(callId) {
  const response = await axiosInstance.get(`/video/analyses/${callId}`);
  return response.data;
}

export async function getAnalysisDetail(id) {
  const response = await axiosInstance.get(`/video/analysis/${id}`);
  return response.data;
}

export async function getAllAnalyses(params = {}) {
  const response = await axiosInstance.get("/video/analyses", { params });
  return response.data;
}

export async function getAnalysisStats() {
  const response = await axiosInstance.get("/video/analyses/stats");
  return response.data;
}

export async function getMyServers() {
  const response = await axiosInstance.get("/servers");
  return response.data;
}

export async function createServer(data) {
  const response = await axiosInstance.post("/servers", data);
  return response.data;
}

export async function generateInviteCode(serverId) {
  const response = await axiosInstance.post(`/servers/${serverId}/invite`);
  return response.data;
}

export async function getInviteInfo(code) {
  const response = await axiosInstance.get(`/servers/invite/${code}`);
  return response.data;
}

export async function joinServerByInvite(code) {
  const response = await axiosInstance.post(`/servers/join/${code}`);
  return response.data;
}

export async function migrateExistingChannels() {
  const response = await axiosInstance.post("/servers/migrate");
  return response.data;
}

export async function getFriends() {
  const response = await axiosInstance.get("/friends");
  return response.data;
}

export async function getPendingRequests() {
  const response = await axiosInstance.get("/friends/requests");
  return response.data;
}

export async function getBlockedUsers() {
  const response = await axiosInstance.get("/friends/blocked");
  return response.data;
}

export async function sendFriendRequest(targetId) {
  const response = await axiosInstance.post(`/friends/request/${targetId}`);
  return response.data;
}

export async function acceptFriendRequest(id) {
  const response = await axiosInstance.post(`/friends/accept/${id}`);
  return response.data;
}

export async function rejectFriendRequest(id) {
  const response = await axiosInstance.post(`/friends/reject/${id}`);
  return response.data;
}

export async function cancelFriendRequest(id) {
  const response = await axiosInstance.post(`/friends/cancel/${id}`);
  return response.data;
}

export async function removeFriend(id) {
  const response = await axiosInstance.delete(`/friends/remove/${id}`);
  return response.data;
}

export async function blockUser(targetId) {
  const response = await axiosInstance.post(`/friends/block/${targetId}`);
  return response.data;
}

export async function unblockUser(targetId) {
  const response = await axiosInstance.delete(`/friends/block/${targetId}`);
  return response.data;
}
