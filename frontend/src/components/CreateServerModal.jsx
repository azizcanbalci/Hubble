import { useState } from "react";
import { XIcon, ServerIcon, LinkIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useChatContext } from "stream-chat-react";
import { createServer, joinServerByInvite } from "../lib/api";
import toast from "react-hot-toast";

const CreateServerModal = ({ onClose, onServerCreated, onServerJoined }) => {
  const [tab, setTab] = useState("create"); // "create" | "join"
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const { client } = useChatContext();

  const createMutation = useMutation({
    mutationFn: createServer,
    onSuccess: async ({ server, serverId }) => {
      // Create the initial "genel" channel in Stream from the frontend client
      try {
        const slug = `${serverId.replace(/-/g, "").slice(0, 12)}-genel`;
        const channel = client.channel("messaging", slug, {
          name: "genel",
          serverId,
          created_by_id: client.userID,
          members: [client.userID],
          visibility: "public",
        });
        await channel.watch();
      } catch {
        // Non-fatal: server was created, channel creation failed
      }
      toast.success(`"${server.name}" sunucusu oluşturuldu!`);
      onServerCreated(server);
      onClose();
    },
    onError: () => toast.error("Sunucu oluşturulamadı"),
  });

  const joinMutation = useMutation({
    mutationFn: joinServerByInvite,
    onSuccess: ({ server }) => {
      toast.success(`"${server.name}" sunucusuna katıldın!`);
      onServerJoined(server);
      onClose();
    },
    onError: () => toast.error("Sunucuya katılınamadı. Kodu kontrol et."),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), icon: icon.trim() || null });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    // Accept full URL or just the code
    const code = inviteCode.trim().split("/").pop();
    joinMutation.mutate(code);
  };

  return (
    <div className="create-channel-modal-overlay">
      <div className="create-channel-modal">
        <div className="create-channel-modal__header">
          <h2>{tab === "create" ? "Sunucu Oluştur" : "Sunucuya Katıl"}</h2>
          <button onClick={onClose} className="create-channel-modal__close">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="create-server-tabs">
          <button
            className={`create-server-tab ${tab === "create" ? "create-server-tab--active" : ""}`}
            onClick={() => setTab("create")}
          >
            <ServerIcon className="size-4" />
            Oluştur
          </button>
          <button
            className={`create-server-tab ${tab === "join" ? "create-server-tab--active" : ""}`}
            onClick={() => setTab("join")}
          >
            <LinkIcon className="size-4" />
            Davet ile Katıl
          </button>
        </div>

        {tab === "create" ? (
          <form onSubmit={handleCreate} className="create-channel-modal__form">
            <div className="form-group">
              <label htmlFor="server-name">Sunucu Adı</label>
              <input
                id="server-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sunucunuza bir isim verin"
                className="form-input"
                maxLength={50}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="server-icon">İkon (emoji, opsiyonel)</label>
              <input
                id="server-icon"
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="örn. 🚀 🎮 📚"
                className="form-input"
                maxLength={4}
              />
            </div>

            <div className="create-channel-modal__actions">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                İptal
              </button>
              <button
                type="submit"
                disabled={!name.trim() || createMutation.isPending}
                className="btn btn-primary"
              >
                {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="create-channel-modal__form">
            <div className="form-group">
              <label htmlFor="invite-code">Davet Linki veya Kodu</label>
              <input
                id="invite-code"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="https://.../invite/AbCd1234  veya  AbCd1234"
                className="form-input"
                autoFocus
              />
            </div>

            <div className="create-channel-modal__actions">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                İptal
              </button>
              <button
                type="submit"
                disabled={!inviteCode.trim() || joinMutation.isPending}
                className="btn btn-primary"
              >
                {joinMutation.isPending ? "Katılınıyor..." : "Katıl"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateServerModal;
