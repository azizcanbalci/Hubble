import express from "express";
import {
  createServer,
  getMyServers,
  generateInviteCode,
  getInviteInfo,
  joinByInvite,
  migrateExistingChannels,
} from "../controllers/server.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, getMyServers);
router.post("/", protectRoute, createServer);
router.post("/migrate", protectRoute, migrateExistingChannels);
router.get("/invite/:code", getInviteInfo); // public — for invite preview page
router.post("/join/:code", protectRoute, joinByInvite);
router.post("/:serverId/invite", protectRoute, generateInviteCode);

export default router;
