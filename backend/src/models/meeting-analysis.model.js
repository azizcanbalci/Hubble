import mongoose from "mongoose";

const segmentSchema = new mongoose.Schema({
  speaker_id: String,
  start_sec: Number,
  end_sec: Number,
  text: String,
  sentiment: String,
  emoji: String,
  confidence: Number,
}, { _id: false });

const speakerSummarySchema = new mongoose.Schema({
  speaker_id: String,
  dominant_emotion: String,
  dominant_emoji: String,
  segment_count: Number,
  avg_confidence: Number,
}, { _id: false });

const meetingAnalysisSchema = new mongoose.Schema({
  callId:        { type: String, required: true, index: true },
  recordingUrl:  { type: String, required: true },
  analyzedBy:    { type: String, required: true },
  participants:  [String],
  participantIds:[String],
  meetingDate:   Date,

  segments:          [segmentSchema],
  speaker_summaries: [speakerSummarySchema],

  text_emotion:       String,
  text_emoji:         String,
  facial_emotion:     String,
  facial_confidence:  Number,
  overall_emotion:    String,
  overall_emoji:      String,
  total_speakers:     Number,
  total_segments:     Number,
  total_frames_analyzed: Number,
}, { timestamps: true });

meetingAnalysisSchema.index({ callId: 1, recordingUrl: 1 }, { unique: true });

export const MeetingAnalysis = mongoose.model("MeetingAnalysis", meetingAnalysisSchema);
