import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
  getFriends,
  getPendingRequests,
  getBlockedUsers,
} from "../controllers/friend.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/",                    protectRoute, getFriends);
router.get("/requests",            protectRoute, getPendingRequests);
router.get("/blocked",             protectRoute, getBlockedUsers);
router.post("/request/:targetId",  protectRoute, sendFriendRequest);
router.post("/accept/:id",         protectRoute, acceptFriendRequest);
router.post("/reject/:id",         protectRoute, rejectFriendRequest);
router.post("/cancel/:id",         protectRoute, cancelFriendRequest);
router.delete("/remove/:id",       protectRoute, removeFriend);
router.post("/block/:targetId",    protectRoute, blockUser);
router.delete("/block/:targetId",  protectRoute, unblockUser);

export default router;
