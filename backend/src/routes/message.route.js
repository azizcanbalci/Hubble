import express from "express";
import {
  analyzeMessages,
  getMessagesByChannel,
  getSentimentsForChannel,
  markStreamMessageDeleted,
  searchMessagesInChannel,
  storeStreamMessage,
  syncStreamMessageUpdate,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/:channelId/sentiments", protectRoute, getSentimentsForChannel);
router.get("/:channelId/search", protectRoute, searchMessagesInChannel);
router.get("/:channelId", protectRoute, getMessagesByChannel);
router.post("/sync", protectRoute, storeStreamMessage);
router.post("/analyze", protectRoute, analyzeMessages);

export default router;

export const streamWebhookRouter = express.Router();
streamWebhookRouter.post("/message-new", storeStreamMessage);
streamWebhookRouter.post("/message-updated", syncStreamMessageUpdate);
streamWebhookRouter.post("/message-deleted", markStreamMessageDeleted);
