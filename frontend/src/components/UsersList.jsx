import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { useChatContext } from "stream-chat-react";

import * as Sentry from "@sentry/react";
import { CircleIcon } from "lucide-react";

const UsersList = ({ activeChannel }) => {
  const { client } = useChatContext();
  const [_, setSearchParams] = useSearchParams();

  const fetchUsers = useCallback(async () => {
    if (!client?.user) return;

    const response = await client.queryUsers(
      { id: { $ne: client.user.id } },
      { name: 1 },
      { limit: 20 }
    );

    const usersOnly = response.users.filter((user) => !user.id.startsWith("recording-"));

    return usersOnly;
  }, [client]);

  const {
    data: users = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["users-list", client?.user?.id],
    queryFn: fetchUsers,
    enabled: !!client?.user,
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  // staleTime
  // what it does: tells React Query the data is "fresh" for 5 minutes
  // behavior: during these 5 minutes, React Query WON'T refetch the data automatically

  const startDirectMessage = async (targetUser) => {
    if (!targetUser || !client?.user) return;

    try {
      //  bc stream does not allow channelId to be longer than 64 chars
      const channelId = [client.user.id, targetUser.id].sort().join("-").slice(0, 64);
      const channel = client.channel("messaging", channelId, {
        members: [client.user.id, targetUser.id],
      });
      await channel.watch();
      setSearchParams({ channel: channel.id });
    } catch (error) {
      console.log("Error creating DM", error),
        Sentry.captureException(error, {
          tags: { component: "UsersList" },
          extra: {
            context: "create_direct_message",
            targetUserId: targetUser?.id,
          },
        });
    }
  };

  if (isLoading) return <p className="discord-section-message">Loading users...</p>;
  if (isError) return <p className="discord-section-message discord-section-message--error">Failed to load users</p>;
  if (!users.length) return <p className="discord-section-message">No other users found</p>;

  return (
    <div>
      {users.map((user) => {
        const channelId = [client.user.id, user.id].sort().join("-").slice(0, 64);
        const channel = client.channel("messaging", channelId, {
          members: [client.user.id, user.id],
        });
        const unreadCount = channel.countUnread();
        const isActive = activeChannel && activeChannel.id === channelId;

        return (
          <button
            key={user.id}
            onClick={() => startDirectMessage(user)}
            className={`discord-dm-item ${isActive ? "active" : ""} ${unreadCount > 0 ? "unread" : ""}`}
          >
            <div className="discord-dm-item__avatar">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || user.id}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="discord-dm-item__avatar-placeholder">
                  {(user.name || user.id).charAt(0).toUpperCase()}
                </div>
              )}
              <span className={`discord-dm-item__status ${user.online ? "online" : "offline"}`} />
            </div>

            <span className="discord-dm-item__name truncate">
              {user.name || user.id}
            </span>

            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 text-[10px] font-bold rounded-full bg-[#f23f43] text-white">
                {unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default UsersList;
