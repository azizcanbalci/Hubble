import { isValidObjectId } from "mongoose";
import { streamClient, getVideoClient } from "../config/stream.js";
import { User } from "../models/user.model.js";
import { MeetingAnalysis } from "../models/meeting-analysis.model.js";

export const getCallRecordings = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.userId;

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

export const analyzeRecording = async (req, res) => {
  try {
    const { callId } = req.params;
    const { url, meetingDate } = req.body;
    const userId = req.userId;

    if (!url) return res.status(400).json({ message: "url gerekli" });

    const channels = await streamClient.queryChannels(
      { id: { $eq: callId }, members: { $in: [userId] } },
      {},
      { limit: 1, state: true }
    );
    if (!channels.length) return res.status(403).json({ message: "Forbidden" });

    const memberIds = Object.keys(channels[0].state?.members ?? {});

    const mongoIds = memberIds.filter((id) => isValidObjectId(id));
    const clerkIds = memberIds.filter((id) => !isValidObjectId(id));
    const [mongoUsers, clerkUsers] = await Promise.all([
      mongoIds.length ? User.find({ _id: { $in: mongoIds } }).select("email") : [],
      clerkIds.length ? User.find({ clerkId: { $in: clerkIds } }).select("email") : [],
    ]);
    const participants = [...mongoUsers, ...clerkUsers].map((u) => u.email);

    const existing = await MeetingAnalysis.findOne({ callId, recordingUrl: url });
    if (existing) return res.status(200).json(existing);

    const analyzeRes = await fetch("http://127.0.0.1:8000/analyze-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, participants }),
    });

    if (!analyzeRes.ok) {
      const detail = await analyzeRes.text().catch(() => "");
      return res.status(502).json({ message: "Analiz servisi hatası", detail });
    }

    const result = await analyzeRes.json();

    const saved = await MeetingAnalysis.create({
      callId,
      recordingUrl: url,
      analyzedBy: userId,
      participants,
      participantIds: memberIds,
      meetingDate: meetingDate ? new Date(meetingDate) : new Date(),
      ...result,
    });

    return res.status(200).json(saved);
  } catch (error) {
    console.error("analyzeRecording error:", error);
    return res.status(500).json({ message: "Analiz başlatılamadı" });
  }
};

export const getCallAnalyses = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.userId;

    const channels = await streamClient.queryChannels(
      { id: { $eq: callId }, members: { $in: [userId] } },
      {},
      { limit: 1 }
    );
    if (!channels.length) return res.status(403).json({ message: "Forbidden" });

    const analyses = await MeetingAnalysis.find({ callId })
      .select("-segments")
      .sort({ createdAt: -1 });

    return res.status(200).json({ analyses });
  } catch (error) {
    console.error("getCallAnalyses error:", error);
    return res.status(500).json({ message: "Analizler alınamadı" });
  }
};

export const getAnalysisDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const analysis = await MeetingAnalysis.findById(id);
    if (!analysis) return res.status(404).json({ message: "Bulunamadı" });

    const channels = await streamClient.queryChannels(
      { id: { $eq: analysis.callId }, members: { $in: [userId] } },
      {},
      { limit: 1 }
    );
    if (!channels.length) return res.status(403).json({ message: "Forbidden" });

    return res.status(200).json(analysis);
  } catch (error) {
    console.error("getAnalysisDetail error:", error);
    return res.status(500).json({ message: "Analiz detayı alınamadı" });
  }
};

export const getAllAnalyses = async (req, res) => {
  try {
    const userId = req.userId;
    const { emotion, from, to, page = 1, limit = 20 } = req.query;

    const channels = await streamClient.queryChannels(
      { members: { $in: [userId] } },
      {},
      { limit: 100 }
    );
    const callIds = channels.map((ch) => ch.id);

    const filter = { callId: { $in: callIds } };
    if (emotion) filter.overall_emotion = emotion;
    if (from || to) {
      filter.meetingDate = {};
      if (from) filter.meetingDate.$gte = new Date(from);
      if (to) filter.meetingDate.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [analyses, total] = await Promise.all([
      MeetingAnalysis.find(filter)
        .select("-segments")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      MeetingAnalysis.countDocuments(filter),
    ]);

    return res.status(200).json({ analyses, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error("getAllAnalyses error:", error);
    return res.status(500).json({ message: "Analizler alınamadı" });
  }
};

export const getAnalysisStats = async (req, res) => {
  try {
    const userId = req.userId;

    const channels = await streamClient.queryChannels(
      { members: { $in: [userId] } },
      {},
      { limit: 100 }
    );
    const callIds = channels.map((ch) => ch.id);

    const analyses = await MeetingAnalysis.find({ callId: { $in: callIds } })
      .select("overall_emotion facial_confidence total_speakers meetingDate createdAt callId");

    if (!analyses.length) {
      return res.status(200).json({
        totalMeetings: 0,
        totalSpeakers: 0,
        mostCommonEmotion: null,
        avgFacialConfidence: 0,
        emotionBreakdown: {},
        byMonth: [],
      });
    }

    const emotionCount = {};
    let speakersSum = 0;
    let confidenceSum = 0;
    let confidenceCount = 0;
    const monthMap = {};

    for (const a of analyses) {
      if (a.overall_emotion) {
        emotionCount[a.overall_emotion] = (emotionCount[a.overall_emotion] || 0) + 1;
      }
      speakersSum += a.total_speakers || 0;
      if (a.facial_confidence != null) {
        confidenceSum += a.facial_confidence;
        confidenceCount++;
      }
      const date = a.meetingDate || a.createdAt;
      const month = new Date(date).toISOString().slice(0, 7);
      monthMap[month] = (monthMap[month] || 0) + 1;
    }

    const mostCommonEmotion = Object.entries(emotionCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const byMonth = Object.entries(monthMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return res.status(200).json({
      totalMeetings: analyses.length,
      totalSpeakers: speakersSum,
      mostCommonEmotion,
      avgFacialConfidence: confidenceCount ? Math.round((confidenceSum / confidenceCount) * 100) / 100 : 0,
      emotionBreakdown: emotionCount,
      byMonth,
    });
  } catch (error) {
    console.error("getAnalysisStats error:", error);
    return res.status(500).json({ message: "İstatistikler alınamadı" });
  }
};
