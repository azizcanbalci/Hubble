import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useChatContext } from "stream-chat-react";
import * as Sentry from "@sentry/react";
import toast from "react-hot-toast";
import { AlertCircleIcon, HashIcon, LockIcon, UsersIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CreateChannelModal = ({ onClose, serverId }) => {
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState("public");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [_, setSearchParams] = useSearchParams();

  const { client, setActiveChannel } = useChatContext();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!client?.user) return;
      setLoadingUsers(true);
      try {
        const response = await client.queryUsers(
          { id: { $ne: client.user.id } },
          { name: 1 },
          { limit: 100 }
        );
        setUsers(response.users.filter((u) => !u.id.startsWith("recording-")));
      } catch (err) {
        Sentry.captureException(err, { tags: { component: "CreateChannelModal" } });
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [client]);

  useEffect(() => {
    if (channelType === "public") setSelectedMembers(users.map((u) => u.id));
    else setSelectedMembers([]);
  }, [channelType, users]);

  const validateChannelName = (name) => {
    if (!name.trim()) return "Kanal adı gerekli";
    if (name.length < 3) return "En az 3 karakter olmalı";
    if (name.length > 22) return "En fazla 22 karakter olabilir";
    return "";
  };

  const handleChannelNameChange = (e) => {
    const value = e.target.value;
    setChannelName(value);
    setError(validateChannelName(value));
  };

  const handleMemberToggle = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateChannelName(channelName);
    if (validationError) return setError(validationError);
    if (isCreating || !client?.user) return;
    setIsCreating(true);
    setError("");
    try {
      const channelId = channelName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "")
        .slice(0, 20);

      const channelData = {
        name: channelName.trim(),
        created_by_id: client.user.id,
        members: [client.user.id, ...selectedMembers],
      };
      if (description) channelData.description = description;
      if (channelType === "private") {
        channelData.private = true;
        channelData.visibility = "private";
      } else {
        channelData.visibility = "public";
        channelData.discoverable = true;
      }
      if (serverId) channelData.serverId = serverId;

      const channel = client.channel("messaging", channelId, channelData);
      await channel.watch();
      setActiveChannel(channel);
      setSearchParams({ channel: channelId });
      toast.success(`"${channelName}" kanalı oluşturuldu!`);
      onClose();
    } catch (err) {
      console.log("Error creating the channel", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Kanal Oluştur</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-[#f23f43]">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Channel name */}
          <div className="space-y-2">
            <Label htmlFor="channelName">Kanal Adı</Label>
            <div className="relative">
              <HashIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#949ba4]" />
              <Input
                id="channelName"
                type="text"
                value={channelName}
                onChange={handleChannelNameChange}
                placeholder="örn. pazarlama"
                className="pl-9"
                autoFocus
                maxLength={22}
              />
            </div>
            {channelName && (
              <p className="text-xs text-[#949ba4]">
                Kanal ID:{" "}
                <span className="text-[#7c3aed]">
                  #{channelName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "")}
                </span>
              </p>
            )}
          </div>

          {/* Channel type */}
          <div className="space-y-2">
            <Label>Kanal Türü</Label>
            <div className="space-y-2">
              {[
                { value: "public", icon: <HashIcon className="size-4" />, title: "Herkese Açık", desc: "Herkes bu kanala katılabilir" },
                { value: "private", icon: <LockIcon className="size-4" />, title: "Özel", desc: "Sadece davet edilen üyeler katılabilir" },
              ].map(({ value, icon, title, desc }) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
                    channelType === value
                      ? "border-[#7c3aed]/60 bg-[#7c3aed]/10"
                      : "border-white/5 hover:border-white/10 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    value={value}
                    checked={channelType === value}
                    onChange={(e) => setChannelType(e.target.value)}
                    className="accent-[#7c3aed]"
                  />
                  <span className="text-[#949ba4]">{icon}</span>
                  <div>
                    <p className="text-sm font-medium text-[#f2f3f5]">{title}</p>
                    <p className="text-xs text-[#949ba4]">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Members (private only) */}
          {channelType === "private" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Üye Ekle</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#949ba4]">{selectedMembers.length} seçildi</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMembers(users.map((u) => u.id))}
                    disabled={loadingUsers || users.length === 0}
                    className="h-7 text-xs"
                  >
                    <UsersIcon className="size-3 mr-1" />
                    Hepsini Seç
                  </Button>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-white/5 p-1">
                {loadingUsers ? (
                  <p className="text-sm text-[#949ba4] p-2">Yükleniyor...</p>
                ) : users.length === 0 ? (
                  <p className="text-sm text-[#949ba4] p-2">Kullanıcı bulunamadı</p>
                ) : (
                  users.map((user) => (
                    <label key={user.id} className="member-item">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(user.id)}
                        onChange={() => handleMemberToggle(user.id)}
                        className="member-checkbox"
                      />
                      {user.image ? (
                        <img src={user.image} alt={user.name || user.id} className="member-avatar" />
                      ) : (
                        <div className="member-avatar member-avatar-placeholder">
                          <span>{(user.name || user.id).charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <span className="member-name">{user.name || user.id}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama (opsiyonel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bu kanal ne hakkında?"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" disabled={!channelName.trim() || isCreating}>
              {isCreating ? "Oluşturuluyor..." : "Kanal Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChannelModal;
