import { useState, useEffect } from "react";
import { XIcon, SearchIcon, UserPlusIcon, CheckIcon, LoaderIcon } from "lucide-react";
import { useChatContext } from "stream-chat-react";
import { useMutation } from "@tanstack/react-query";
import { sendFriendRequest } from "../lib/api";
import { useFriends } from "../context/FriendsContext";
import toast from "react-hot-toast";

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
        const filtered = response.users.filter(
          (u) => !u.id.startsWith("recording-") && !blockedUserIds.has(u.id)
        );
        setResults(filtered);
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
      const msg = err?.response?.data?.message;
      toast.error(msg || "İstek gönderilemedi");
    },
  });

  const getStatus = (userId) => {
    if (friendIds.has(userId)) return "friend";
    if (sentIds.has(userId) || pendingIds.has(userId)) return "pending";
    return "none";
  };

  return (
    <div className="create-channel-modal-overlay">
      <div className="create-channel-modal">
        <div className="create-channel-modal__header">
          <h2>Arkadaş Ekle</h2>
          <button onClick={onClose} className="create-channel-modal__close">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="create-channel-modal__form">
          {/* Arama input */}
          <div className="form-group">
            <div className="input-with-icon">
              <SearchIcon className="w-4 h-4 input-icon" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Kullanıcı adı veya isim ara..."
                className="form-input"
                autoFocus
              />
            </div>
          </div>

          {/* Sonuçlar */}
          <div className="members-list">
            {searching && (
              <div className="flex items-center gap-2 px-2 py-3 text-sm text-gray-400">
                <LoaderIcon className="size-4 animate-spin" />
                Aranıyor...
              </div>
            )}

            {!searching && query.trim() && results.length === 0 && (
              <p className="discord-section-message">Kullanıcı bulunamadı</p>
            )}

            {results.map((user) => {
              const status = getStatus(user.id);
              return (
                <div key={user.id} className="member-item" style={{ cursor: "default" }}>
                  {user.image ? (
                    <img src={user.image} alt={user.name || user.id} className="member-avatar" />
                  ) : (
                    <div className="member-avatar member-avatar-placeholder">
                      <span>{(user.name || user.id).charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <span className="member-name flex-1">{user.name || user.id}</span>

                  {status === "friend" && (
                    <span className="add-friend-status">Arkadaş</span>
                  )}
                  {status === "pending" && (
                    <span className="add-friend-status add-friend-status--pending">
                      <CheckIcon className="size-3" /> İstek Gönderildi
                    </span>
                  )}
                  {status === "none" && (
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => sendMutation.mutate(user.id)}
                      disabled={sendMutation.isPending && sendMutation.variables === user.id}
                    >
                      <UserPlusIcon className="size-3.5" />
                      İstek Gönder
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="create-channel-modal__actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddFriendModal;
