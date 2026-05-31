import { useState } from "react";
import { ServerIcon, LinkIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useChatContext } from "stream-chat-react";
import { createServer, joinServerByInvite } from "../lib/api";
import toast from "react-hot-toast";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const CreateServerModal = ({ onClose, onServerCreated, onServerJoined }) => {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const { client } = useChatContext();

  const createMutation = useMutation({
    mutationFn: createServer,
    onSuccess: async ({ server, serverId }) => {
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
        // Non-fatal
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
    const code = inviteCode.trim().split("/").pop();
    joinMutation.mutate(code);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sunucu</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="create">
          <TabsList className="w-full">
            <TabsTrigger value="create" className="flex-1 gap-2">
              <ServerIcon className="size-4" />
              Oluştur
            </TabsTrigger>
            <TabsTrigger value="join" className="flex-1 gap-2">
              <LinkIcon className="size-4" />
              Davet ile Katıl
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="server-name">Sunucu Adı</Label>
                <Input
                  id="server-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sunucunuza bir isim verin"
                  maxLength={50}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="server-icon">İkon (emoji, opsiyonel)</Label>
                <Input
                  id="server-icon"
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="örn. 🚀 🎮 📚"
                  maxLength={4}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={onClose}>
                  İptal
                </Button>
                <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
                  {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="join">
            <form onSubmit={handleJoin} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="invite-code">Davet Linki veya Kodu</Label>
                <Input
                  id="invite-code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="https://.../invite/AbCd1234  veya  AbCd1234"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={onClose}>
                  İptal
                </Button>
                <Button type="submit" disabled={!inviteCode.trim() || joinMutation.isPending}>
                  {joinMutation.isPending ? "Katılınıyor..." : "Katıl"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CreateServerModal;
