import express from "express";
import { getCallRecordings } from "../controllers/video.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/recordings/:callId", protectRoute, getCallRecordings);

export default router;
