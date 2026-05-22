import express from "express";
import {
  getCallRecordings,
  analyzeRecording,
  getCallAnalyses,
  getAnalysisDetail,
  getAllAnalyses,
  getAnalysisStats,
} from "../controllers/video.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/recordings/:callId", protectRoute, getCallRecordings);
router.post("/analyze/:callId",   protectRoute, analyzeRecording);

// /analyses/stats must come before /analyses/:callId to avoid route conflict
router.get("/analyses/stats",    protectRoute, getAnalysisStats);
router.get("/analyses",          protectRoute, getAllAnalyses);
router.get("/analyses/:callId",  protectRoute, getCallAnalyses);
router.get("/analysis/:id",      protectRoute, getAnalysisDetail);

export default router;
