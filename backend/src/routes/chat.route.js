import express from "express";
import {
  getStreamToken,
  getUserSettings,
  updateUserSettings,
} from "../controllers/chat.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/token", protectRoute, getStreamToken);
router.get("/settings", protectRoute, getUserSettings);
router.patch("/settings", protectRoute, updateUserSettings);

export default router;
