import { isValidObjectId } from "mongoose";
import { Friendship } from "../models/friendship.model.js";
import { Block } from "../models/block.model.js";
import { User } from "../models/user.model.js";

/* ── helpers ──────────────────────────────────────────────────── */

const populateUsers = async (userIds) => {
  const mongoIds = userIds.filter((id) => isValidObjectId(id));
  const clerkIds = userIds.filter((id) => !isValidObjectId(id));

  const [byObjectId, byClerkId] = await Promise.all([
    mongoIds.length
      ? User.find({ _id: { $in: mongoIds } }, "name image email").lean()
      : [],
    clerkIds.length
      ? User.find({ clerkId: { $in: clerkIds } }, "clerkId name image email").lean()
      : [],
  ]);

  const map = {};
  for (const u of byObjectId) map[u._id.toString()] = u;
  for (const u of byClerkId) map[u.clerkId] = u;
  return map;
};

/* ── friend requests ─────────────────────────────────────────── */

export const sendFriendRequest = async (req, res) => {
  try {
    const userId = req.userId;
    const { targetId } = req.params;

    if (userId === targetId) {
      return res.status(400).json({ message: "Kendinize istek gönderemezsiniz" });
    }

    const block = await Block.findOne({
      $or: [
        { blockerId: userId, blockedId: targetId },
        { blockerId: targetId, blockedId: userId },
      ],
    });
    if (block) {
      return res.status(403).json({ message: "Bu kullanıcıya istek gönderilemiyor" });
    }

    const target = await User.findOne(
      isValidObjectId(targetId) ? { _id: targetId } : { clerkId: targetId }
    ).select("settings");
    if (target?.settings?.allowFriendRequests === false) {
      return res.status(403).json({ message: "Bu kullanıcı arkadaşlık isteklerini kapalı tutmuş" });
    }

    await Friendship.create({ senderId: userId, receiverId: targetId });
    return res.status(201).json({ message: "Arkadaşlık isteği gönderildi" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "İstek zaten gönderilmiş" });
    }
    console.error("sendFriendRequest error:", error);
    return res.status(500).json({ message: "İstek gönderilemedi" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const friendship = await Friendship.findOne({ _id: id, receiverId: userId, status: "pending" });
    if (!friendship) {
      return res.status(404).json({ message: "İstek bulunamadı" });
    }

    friendship.status = "accepted";
    await friendship.save();
    return res.status(200).json({ message: "Arkadaşlık isteği kabul edildi" });
  } catch (error) {
    console.error("acceptFriendRequest error:", error);
    return res.status(500).json({ message: "İstek kabul edilemedi" });
  }
};

export const rejectFriendRequest = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    await Friendship.deleteOne({ _id: id, receiverId: userId, status: "pending" });
    return res.status(200).json({ message: "İstek reddedildi" });
  } catch (error) {
    console.error("rejectFriendRequest error:", error);
    return res.status(500).json({ message: "İstek reddedilemedi" });
  }
};

export const cancelFriendRequest = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    await Friendship.deleteOne({ _id: id, senderId: userId, status: "pending" });
    return res.status(200).json({ message: "İstek iptal edildi" });
  } catch (error) {
    console.error("cancelFriendRequest error:", error);
    return res.status(500).json({ message: "İstek iptal edilemedi" });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    await Friendship.deleteOne({
      _id: id,
      status: "accepted",
      $or: [{ senderId: userId }, { receiverId: userId }],
    });
    return res.status(200).json({ message: "Arkadaş kaldırıldı" });
  } catch (error) {
    console.error("removeFriend error:", error);
    return res.status(500).json({ message: "Arkadaş kaldırılamadı" });
  }
};

/* ── blocking ───────────────────────────────────────────────── */

export const blockUser = async (req, res) => {
  try {
    const userId = req.userId;
    const { targetId } = req.params;

    if (userId === targetId) {
      return res.status(400).json({ message: "Kendinizi engelleyemezsiniz" });
    }

    await Friendship.deleteOne({
      $or: [
        { senderId: userId, receiverId: targetId },
        { senderId: targetId, receiverId: userId },
      ],
    });

    await Block.create({ blockerId: userId, blockedId: targetId });
    return res.status(201).json({ message: "Kullanıcı engellendi" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Kullanıcı zaten engellendi" });
    }
    console.error("blockUser error:", error);
    return res.status(500).json({ message: "Engelleme başarısız" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const userId = req.userId;
    const { targetId } = req.params;

    await Block.deleteOne({ blockerId: userId, blockedId: targetId });
    return res.status(200).json({ message: "Engel kaldırıldı" });
  } catch (error) {
    console.error("unblockUser error:", error);
    return res.status(500).json({ message: "Engel kaldırılamadı" });
  }
};

/* ── read endpoints ─────────────────────────────────────────── */

export const getFriends = async (req, res) => {
  try {
    const userId = req.userId;

    const friendships = await Friendship.find({
      status: "accepted",
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).lean();

    const friendIds = friendships.map((f) =>
      f.senderId === userId ? f.receiverId : f.senderId
    );

    const userMap = await populateUsers(friendIds);

    const friends = friendships.map((f) => {
      const friendId = f.senderId === userId ? f.receiverId : f.senderId;
      const userInfo = userMap[friendId] || {};
      return {
        friendshipId: f._id,
        userId: friendId,
        name: userInfo.name || friendId,
        image: userInfo.image || null,
        email: userInfo.email || null,
      };
    });

    return res.status(200).json({ friends });
  } catch (error) {
    console.error("getFriends error:", error);
    return res.status(500).json({ message: "Arkadaşlar alınamadı" });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.userId;

    const [incomingRaw, outgoingRaw] = await Promise.all([
      Friendship.find({ receiverId: userId, status: "pending" }).lean(),
      Friendship.find({ senderId: userId, status: "pending" }).lean(),
    ]);

    const allIds = [
      ...incomingRaw.map((f) => f.senderId),
      ...outgoingRaw.map((f) => f.receiverId),
    ];
    const userMap = await populateUsers(allIds);

    const incoming = incomingRaw.map((f) => {
      const u = userMap[f.senderId] || {};
      return { id: f._id, senderId: f.senderId, name: u.name || f.senderId, image: u.image || null };
    });

    const outgoing = outgoingRaw.map((f) => {
      const u = userMap[f.receiverId] || {};
      return { id: f._id, receiverId: f.receiverId, name: u.name || f.receiverId, image: u.image || null };
    });

    return res.status(200).json({ incoming, outgoing });
  } catch (error) {
    console.error("getPendingRequests error:", error);
    return res.status(500).json({ message: "İstekler alınamadı" });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.userId;

    const blocks = await Block.find({ blockerId: userId }).lean();
    const blockedIds = blocks.map((b) => b.blockedId);
    const userMap = await populateUsers(blockedIds);

    const blocked = blocks.map((b) => {
      const u = userMap[b.blockedId] || {};
      return { blockId: b._id, userId: b.blockedId, name: u.name || b.blockedId, image: u.image || null };
    });

    return res.status(200).json({ blocked });
  } catch (error) {
    console.error("getBlockedUsers error:", error);
    return res.status(500).json({ message: "Engellenenler alınamadı" });
  }
};
