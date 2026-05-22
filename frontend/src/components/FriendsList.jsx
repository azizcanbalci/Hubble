import { useState } from "react";
import { useSearchParams } from "react-router";
import { useChatContext } from "stream-chat-react";
import { useMutation } from "@tanstack/react-query";
import {
  CheckIcon,
  XIcon,
  MessageCircleIcon,
  UserMinusIcon,
  ShieldOffIcon,
  UserPlusIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import {
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  blockUser,
} from "../lib/api";
import { useFriends } from "../context/FriendsContext";
import AddFriendModal from "./AddFriendModal";
import toast from "react-hot-toast";

/* ── Avatar helper ───────────────────────────────────────────── */
const Avatar = ({ image, name, size = "sm" }) => {
  const dim = size === "sm" ? "w-8 h-8 text-sm" : "w-9 h-9 text-sm";
  return image ? (
    <img src={image} alt={name} className={`${dim} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${dim} rounded-full bg-indigo-600 flex items-center justify-center font-semibold text-white flex-shrink-0`}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
};

/* ── FriendsList ─────────────────────────────────────────────── */
const FriendsList = ({ activeChannel }) => {
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [_, setSearchParams] = useSearchParams();
  const { client } = useChatContext();
  const { friends, pendingRequests, refetchFriends, refetchRequests, refetchBlocked } = useFriends();

  const { incoming, outgoing } = pendingRequests;

  const acceptMutation = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => { refetchFriends(); refetchRequests(); },
    onError: () => toast.error("İstek kabul edilemedi"),
  });

  const rejectMutation = useMutation({
    mutationFn: rejectFriendRequest,
    onSuccess: () => refetchRequests(),
    onError: () => toast.error("İstek reddedilemedi"),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelFriendRequest,
    onSuccess: () => refetchRequests(),
    onError: () => toast.error("İstek iptal edilemedi"),
  });

  const removeMutation = useMutation({
    mutationFn: removeFriend,
    onSuccess: () => { refetchFriends(); toast.success("Arkadaş kaldırıldı"); },
    onError: () => toast.error("Arkadaş kaldırılamadı"),
  });

  const blockMutation = useMutation({
    mutationFn: blockUser,
    onSuccess: () => { refetchFriends(); refetchBlocked(); toast.success("Kullanıcı engellendi"); },
    onError: () => toast.error("Engelleme başarısız"),
  });

  const startDM = async (userId) => {
    if (!client?.user) return;
    try {
      const channelId = [client.user.id, userId].sort().join("-").slice(0, 64);
      const channel = client.channel("messaging", channelId, { members: [client.user.id, userId] });
      await channel.watch();
      setSearchParams({ channel: channel.id });
    } catch {
      toast.error("DM açılamadı");
    }
  };

  return (
    <>
      {/* ── Bekleyen gelen istekler ── */}
      {incoming.length > 0 && (
        <div className="friends-section">
          <div className="friends-section-header">
            Bekleyen İstekler
            <span className="friends-section-badge">{incoming.length}</span>
          </div>
          {incoming.map((req) => (
            <div key={req.id} className="friend-item">
              <Avatar image={req.image} name={req.name} />
              <span className="friend-item__name">{req.name}</span>
              <div className="friend-item__actions friend-item__actions--always">
                <button
                  className="friend-action-btn friend-action-btn--accept"
                  onClick={() => acceptMutation.mutate(String(req.id))}
                  title="Kabul Et"
                  disabled={acceptMutation.isPending}
                >
                  <CheckIcon className="size-3.5" />
                </button>
                <button
                  className="friend-action-btn friend-action-btn--reject"
                  onClick={() => rejectMutation.mutate(String(req.id))}
                  title="Reddet"
                  disabled={rejectMutation.isPending}
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Gönderilen istekler ── */}
      {outgoing.length > 0 && (
        <div className="friends-section">
          <div className="friends-section-header">Gönderilen İstekler</div>
          {outgoing.map((req) => (
            <div key={req.id} className="friend-item">
              <Avatar image={req.image} name={req.name} />
              <span className="friend-item__name">{req.name}</span>
              <div className="friend-item__actions friend-item__actions--always">
                <button
                  className="friend-action-btn friend-action-btn--reject"
                  onClick={() => cancelMutation.mutate(String(req.id))}
                  title="İptal Et"
                  disabled={cancelMutation.isPending}
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Arkadaşlar ── */}
      <div className="friends-section">
        <div className="friends-section-header">
          Arkadaşlar
          {friends.length > 0 && (
            <span className="friends-section-count">{friends.length}</span>
          )}
        </div>

        {friends.length === 0 && (
          <p className="friends-empty">Henüz arkadaşın yok.</p>
        )}

        {friends.map((friend) => {
          const channelId = [client?.user?.id, friend.userId].sort().join("-").slice(0, 64);
          const isActive = activeChannel?.id === channelId;

          return (
            <div
              key={friend.friendshipId}
              className={`friend-item ${isActive ? "friend-item--active" : ""}`}
              onMouseLeave={() => setOpenMenuId(null)}
            >
              <Avatar image={friend.image} name={friend.name} />
              <span className="friend-item__name">{friend.name}</span>

              <div className="friend-item__actions">
                <button
                  className="friend-action-btn"
                  onClick={() => startDM(friend.userId)}
                  title="Mesaj Gönder"
                >
                  <MessageCircleIcon className="size-3.5" />
                </button>
                <div className="friend-menu-wrapper">
                  <button
                    className="friend-action-btn"
                    onClick={() => setOpenMenuId(openMenuId === friend.friendshipId ? null : friend.friendshipId)}
                    title="Seçenekler"
                  >
                    <MoreHorizontalIcon className="size-3.5" />
                  </button>
                  {openMenuId === friend.friendshipId && (
                    <div className="friend-dropdown">
                      <button
                        className="friend-dropdown__item"
                        onClick={() => { removeMutation.mutate(String(friend.friendshipId)); setOpenMenuId(null); }}
                      >
                        <UserMinusIcon className="size-3.5" />
                        Arkadaşı Kaldır
                      </button>
                      <button
                        className="friend-dropdown__item friend-dropdown__item--danger"
                        onClick={() => { blockMutation.mutate(friend.userId); setOpenMenuId(null); }}
                      >
                        <ShieldOffIcon className="size-3.5" />
                        Engelle
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Arkadaş Ekle butonu */}
        <button className="add-friend-btn" onClick={() => setShowAddFriend(true)}>
          <UserPlusIcon className="size-4" />
          Arkadaş Ekle
        </button>
      </div>

      {showAddFriend && <AddFriendModal onClose={() => setShowAddFriend(false)} />}
    </>
  );
};

export default FriendsList;
