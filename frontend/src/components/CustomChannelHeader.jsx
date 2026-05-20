import {
  HashIcon,
  LockIcon,
  UsersIcon,
  PinIcon,
  VideoIcon,
  BrainIcon,
  SearchIcon,
} from "lucide-react";
import {
  useChannelActionContext,
  useChannelStateContext,
} from "stream-chat-react";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import MembersModal from "./MembersModal";
import PinnedMessagesModal from "./PinnedMessagesModal";
import InviteModal from "./InviteModal";
import ChannelSearchModal from "./ChannelSearchModal";

const CustomChannelHeader = () => {
  const { channel } = useChannelStateContext();
  const { jumpToMessage } = useChannelActionContext();
  const { user } = useUser();

  const memberCount = Object.keys(channel.state.members).length;

  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  const otherUser = Object.values(channel.state.members).find(
    (member) => member.user.id !== user.id,
  );

  const isDM =
    channel.data?.member_count === 2 && channel.data?.id.includes("user_");

  const handleShowPinned = async () => {
    const channelState = await channel.query();
    setPinnedMessages(channelState.pinned_messages);
    setShowPinnedMessages(true);
  };

  const handleVideoCall = async () => {
    if (channel) {
      const callUrl = `${window.location.origin}/call/${channel.id}`;
      await channel.sendMessage({
        text: `I've started a video call. Join me here: ${callUrl}`,
      });
    }
  };

  const handleSelectSearchResult = (messageId) => {
    if (!messageId) return;

    if (typeof jumpToMessage === "function") {
      jumpToMessage(messageId);
    }
  };

  useEffect(() => {
    const handleShortcut = (event) => {
      const isSearchShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (!isSearchShortcut) return;

      const tagName = (event.target?.tagName || "").toLowerCase();
      const isTypingTarget =
        tagName === "input" ||
        tagName === "textarea" ||
        event.target?.isContentEditable;

      if (isTypingTarget) return;

      event.preventDefault();
      setShowSearch(true);
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <div className="h-14 border-b border-gray-200 flex items-center px-4 justify-between bg-white">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {channel.data?.private ? (
            <LockIcon className="size-4 text-[#616061]" />
          ) : (
            <HashIcon className="size-4 text-[#616061]" />
          )}

          {isDM && otherUser?.user?.image && (
            <img
              src={otherUser.user.image}
              alt={otherUser.user.name || otherUser.user.id}
              className="size-7 rounded-full object-cover mr-1"
            />
          )}

          <span className="font-medium text-[#1D1C1D]">
            {isDM
              ? otherUser?.user?.name || otherUser?.user?.id
              : channel.data?.id}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-1 hover:bg-[#efecec] py-1 px-2 rounded"
          type="button"
          title="Analyze Messages"
        >
          <BrainIcon className="size-4 text-[#616061]" />
          <span className="text-sm text-[#616061]">Analyze</span>
        </button>

        <button
          className="flex items-center gap-2 hover:bg-[#F8F8F8] py-1 px-2 rounded"
          onClick={() => setShowMembers(true)}
        >
          <UsersIcon className="size-5 text-[#616061]" />
          <span className="text-sm text-[#616061]">{memberCount}</span>
        </button>

        <button
          className="hover:bg-[#F8F8F8] p-1 rounded"
          onClick={() => setShowSearch(true)}
          title="Search in Channel (Ctrl/Cmd + K)"
        >
          <SearchIcon className="size-5 text-[#616061]" />
        </button>

        <button
          className="hover:bg-[#F8F8F8] p-1 rounded"
          onClick={handleVideoCall}
          title="Start Video Call"
        >
          <VideoIcon className="size-5 text-[#1264A3]" />
        </button>

        {channel.data?.private && (
          <button
            className="btn btn-primary"
            onClick={() => setShowInvite(true)}
          >
            Invite
          </button>
        )}

        <button
          className="hover:bg-[#F8F8F8] p-1 rounded"
          onClick={handleShowPinned}
        >
          <PinIcon className="size-4 text-[#616061]" />
        </button>
      </div>

      {showMembers && (
        <MembersModal
          members={Object.values(channel.state.members)}
          onClose={() => setShowMembers(false)}
        />
      )}

      {showPinnedMessages && (
        <PinnedMessagesModal
          pinnedMessages={pinnedMessages}
          onClose={() => setShowPinnedMessages(false)}
        />
      )}

      {showInvite && (
        <InviteModal channel={channel} onClose={() => setShowInvite(false)} />
      )}

      {showSearch && (
        <ChannelSearchModal
          channelId={channel.id}
          channelName={
            isDM
              ? otherUser?.user?.name || otherUser?.user?.id
              : channel.data?.id
          }
          onClose={() => setShowSearch(false)}
          onSelectMessage={handleSelectSearchResult}
        />
      )}
    </div>
  );
};

export default CustomChannelHeader;
