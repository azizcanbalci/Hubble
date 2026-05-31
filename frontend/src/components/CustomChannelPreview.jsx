import { HashIcon, LockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CustomChannelPreview = ({ channel, setActiveChannel, activeChannel }) => {
  const isActive = activeChannel && activeChannel.id === channel.id;
  const isDM = channel.data.member_count === 2 && channel.data.id.includes("user_");

  if (isDM) return null;

  const unreadCount = channel.countUnread();

  return (
    <button
      onClick={() => setActiveChannel(channel)}
      className={`discord-channel-item ${isActive ? "active" : ""} ${unreadCount > 0 ? "unread" : ""}`}
    >
      {channel.data?.private ? (
        <LockIcon className="channel-icon size-4" />
      ) : (
        <HashIcon className="channel-icon size-4" />
      )}
      <span className="flex-1 truncate text-left">{channel.data.id}</span>
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="h-4 min-w-4 px-1 text-[10px] font-bold rounded-full"
        >
          {unreadCount}
        </Badge>
      )}
    </button>
  );
};

export default CustomChannelPreview;
