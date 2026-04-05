import express from "express";
import {
  getMessagesByChannel,
  markStreamMessageDeleted,
  storeStreamMessage,
  syncStreamMessageUpdate,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/:channelId", protectRoute, getMessagesByChannel);

export default router;

export const streamWebhookRouter = express.Router();
streamWebhookRouter.post("/message-new", storeStreamMessage);
streamWebhookRouter.post("/message-updated", syncStreamMessageUpdate);
streamWebhookRouter.post("/message-deleted", markStreamMessageDeleted);
