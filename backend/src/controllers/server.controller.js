import crypto from "crypto";
import { streamClient } from "../config/stream.js";
import { Server } from "../models/server.model.js";
import { Channel } from "../models/channel.model.js";

export const createServer = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { name, icon } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Sunucu adı gerekli" });
    }

    const serverId = crypto.randomUUID();

    const server = await Server.create({
      serverId,
      name: name.trim(),
      icon: icon || null,
      ownerId: userId,
      members: [{ userId, role: "owner" }],
    });

    return res.status(201).json({ server, serverId });
  } catch (error) {
    console.error("createServer error:", error);
    return res.status(500).json({ message: "Sunucu oluşturulamadı" });
  }
};

export const getMyServers = async (req, res) => {
  try {
    const { userId } = req.auth();
    const servers = await Server.find({ "members.userId": userId }).lean();
    return res.status(200).json({ servers });
  } catch (error) {
    console.error("getMyServers error:", error);
    return res.status(500).json({ message: "Sunucular alınamadı" });
  }
};

export const generateInviteCode = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { serverId } = req.params;

    const server = await Server.findOne({ serverId });
    if (!server) return res.status(404).json({ message: "Sunucu bulunamadı" });

    const member = server.members.find((m) => m.userId === userId);
    if (!member || member.role === "member") {
      return res.status(403).json({ message: "Davet kodu oluşturmak için yetkiniz yok" });
    }

    const code = crypto.randomBytes(6).toString("base64url").slice(0, 8);
    server.inviteCodes.push({ code, createdBy: userId });
    await server.save();

    return res.status(200).json({ code });
  } catch (error) {
    console.error("generateInviteCode error:", error);
    return res.status(500).json({ message: "Davet kodu oluşturulamadı" });
  }
};

export const getInviteInfo = async (req, res) => {
  try {
    const { code } = req.params;
    const server = await Server.findOne({ "inviteCodes.code": code }).lean();
    if (!server) return res.status(404).json({ message: "Geçersiz veya süresi dolmuş davet" });

    return res.status(200).json({
      name: server.name,
      icon: server.icon,
      memberCount: server.members.length,
      serverId: server.serverId,
    });
  } catch (error) {
    console.error("getInviteInfo error:", error);
    return res.status(500).json({ message: "Davet bilgisi alınamadı" });
  }
};

export const joinByInvite = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { code } = req.params;

    const server = await Server.findOne({ "inviteCodes.code": code });
    if (!server) return res.status(404).json({ message: "Geçersiz veya süresi dolmuş davet" });

    const alreadyMember = server.members.some((m) => m.userId === userId);
    if (!alreadyMember) {
      server.members.push({ userId, role: "member" });
      await server.save();
    }

    // Add user to all Stream channels in this server
    const serverChannels = await streamClient.queryChannels(
      { serverId: { $eq: server.serverId } },
      {},
      { limit: 100, state: false }
    );

    await Promise.all(
      serverChannels.map((ch) =>
        ch.addMembers([userId]).catch(() => {})
      )
    );

    return res.status(200).json({ server: server.toObject() });
  } catch (error) {
    console.error("joinByInvite error:", error);
    return res.status(500).json({ message: "Sunucuya katılınamadı" });
  }
};

export const migrateExistingChannels = async (req, res) => {
  try {
    const { userId } = req.auth();

    // Idempotent: return existing if already migrated
    const existingServer = await Server.findOne({ name: "Ana Sunucu" }).lean();
    if (existingServer) {
      return res.status(200).json({ server: existingServer });
    }

    const serverId = crypto.randomUUID();

    // Query all Stream channels the user is in that have a custom name
    // (DM channels created via Stream's DM pattern won't have a name field)
    const allStreamChannels = await streamClient.queryChannels(
      { members: { $in: [userId] } },
      {},
      { limit: 200, state: false }
    );

    // Server channels have a name; auto-generated DM channels don't
    const serverChannels = allStreamChannels.filter((ch) => ch.data?.name);

    // Collect all unique member IDs across all server channels
    const memberIdSet = new Set([userId]);
    for (const ch of serverChannels) {
      const memberIds = Object.keys(ch.state?.members || {});
      for (const id of memberIds) {
        if (!id.startsWith("recording-")) memberIdSet.add(id);
      }
    }

    const members = [
      { userId, role: "owner" },
      ...[...memberIdSet]
        .filter((id) => id !== userId)
        .map((id) => ({ userId: id, role: "member" })),
    ];

    const server = await Server.create({
      serverId,
      name: "Ana Sunucu",
      icon: "🌐",
      ownerId: userId,
      members,
    });

    // Set serverId on all Stream server channels
    await Promise.all(
      serverChannels.map((ch) =>
        ch.updatePartial({ set: { serverId } }).catch(() => {})
      )
    );

    // Upsert MongoDB Channel records for each
    await Promise.all(
      serverChannels.map((ch) =>
        Channel.updateOne(
          { slug: ch.id },
          { $set: { serverId, name: ch.data.name } },
          { upsert: true }
        ).catch(() => {})
      )
    );

    return res.status(200).json({ server: server.toObject() });
  } catch (error) {
    console.error("migrateExistingChannels error:", error);
    return res.status(500).json({ message: "Taşıma işlemi başarısız" });
  }
};
