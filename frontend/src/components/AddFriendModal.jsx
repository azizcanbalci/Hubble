import { useState, useEffect } from "react";
import { SearchIcon, UserPlusIcon, CheckIcon, LoaderIcon } from "lucide-react";
import { useChatContext } from "stream-chat-react";
import { useMutation } from "@tanstack/react-query";
import { sendFriendRequest } from "../lib/api";
import { useFriends } from "../context/FriendsContext";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const AddFriendModal = ({ onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState(new Set());

  const { client } = useChatContext();
  const { friends, pendingRequests, blockedUserIds, refetchRequests } = useFriends();

  const friendIds = new Set(friends.map((f) => f.userId));
  const pendingIds = new Set([
    ...pendingRequests.incoming.map((r) => r.senderId),
    ...pendingRequests.outgoing.map((r) => r.receiverId),
  ]);

  useEffect(() => {
    if (!query.trim() || !client?.user) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await client.queryUsers(
          {
            $and: [
              { id: { $ne: client.user.id } },
              { $or: [{ name: { $autocomplete: query } }, { id: { $autocomplete: query } }] },
            ],
          },
          { name: 1 },
          { limit: 10 }
        );
        setResults(
          response.users.filter(
            (u) => !u.id.startsWith("recording-") && !blockedUserIds.has(u.id)
          )
        );
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, client, blockedUserIds]);

  const sendMutation = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: (_, targetId) => {
      setSentIds((prev) => new Set([...prev, targetId]));
      refetchRequests();
      toast.success("Arkadaşlık isteği gönderildi");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "İstek gönderilemedi");
    },
  });

  const getStatus = (userId) => {
    if (friendIds.has(userId)) return "friend";
    if (sentIds.has(userId) || pendingIds.has(userId)) return "pending";
    return "none";
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Arkadaş Ekle</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#949ba4]" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kullanıcı adı veya isim ara..."
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {searching && (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-[#949ba4]">
              <LoaderIcon className="size-4 animate-spin" />
              Aranıyor...
            </div>
          )}

          {!searching && query.trim() && results.length === 0 && (
            <p className="text-sm text-[#949ba4] px-2 py-3">Kullanıcı bulunamadı</p>
          )}

          {results.map((user) => {
            const status = getStatus(user.id);
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Avatar className="size-9">
                  <AvatarImage src={user.image} alt={user.name || user.id} />
                  <AvatarFallback className="text-xs">
                    {(user.name || user.id).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-[#dcddde] flex-1">
                  {user.name || user.id}
                </span>

                {status === "friend" && (
                  <Badge variant="secondary" className="text-xs">Arkadaş</Badge>
                )}
                {status === "pending" && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <CheckIcon className="size-3" />
                    Gönderildi
                  </Badge>
                )}
                {status === "none" && (
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => sendMutation.mutate(user.id)}
                    disabled={sendMutation.isPending && sendMutation.variables === user.id}
                  >
                    <UserPlusIcon className="size-3.5" />
                    İstek Gönder
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddFriendModal;
