import { useEffect, useState } from "react";
import { useChatContext } from "stream-chat-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

const InviteModal = ({ channel, onClose }) => {
  const { client } = useChatContext();

  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      setError("");
      try {
        const members = Object.keys(channel.state.members);
        const res = await client.queryUsers({ id: { $nin: members } }, { name: 1 }, { limit: 30 });
        setUsers(res.users);
      } catch {
        setError("Kullanıcılar yüklenemedi.");
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [channel, client]);

  const handleInvite = async () => {
    if (selectedMembers.length === 0) return;
    setIsInviting(true);
    setError("");
    try {
      await channel.addMembers(selectedMembers);
      onClose();
    } catch {
      setError("Davet gönderilemedi.");
    } finally {
      setIsInviting(false);
    }
  };

  const toggleMember = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kullanıcı Davet Et</DialogTitle>
        </DialogHeader>

        {error && <p className="text-sm text-[#f23f43]">{error}</p>}
        {isLoadingUsers && <p className="text-sm text-[#949ba4]">Yükleniyor...</p>}
        {!isLoadingUsers && users.length === 0 && (
          <p className="text-sm text-[#949ba4]">Davet edilebilecek kullanıcı bulunamadı.</p>
        )}

        <ScrollArea className="max-h-72 pr-2">
          <div className="space-y-1">
            {users.map((user) => {
              const isChecked = selectedMembers.includes(user.id);
              return (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                    isChecked
                      ? "border-[#7c3aed]/60 bg-[#7c3aed]/10"
                      : "border-white/5 hover:border-white/10 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-[#7c3aed] size-4"
                    checked={isChecked}
                    onChange={() => toggleMember(user.id)}
                  />
                  <Avatar className="size-8">
                    <AvatarImage src={user.image} alt={user.name} />
                    <AvatarFallback className="text-xs">
                      {(user.name || user.id).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-[#dcddde]">
                    {user.name || user.id}
                  </span>
                </label>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isInviting}>
            İptal
          </Button>
          <Button
            onClick={handleInvite}
            disabled={!selectedMembers.length || isInviting}
          >
            {isInviting ? "Davet Ediliyor..." : `Davet Et (${selectedMembers.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteModal;
