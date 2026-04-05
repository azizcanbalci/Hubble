import express from "express";
import { createChannel, getMyChannels } from "../controllers/channel.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, getMyChannels);
router.post("/", protectRoute, createChannel);

export default router;
