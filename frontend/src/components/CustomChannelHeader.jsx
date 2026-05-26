import {
  HashIcon,
  LockIcon,
  UsersIcon,
  PinIcon,
  VideoIcon,
  BrainIcon,
  SearchIcon,
  LoaderIcon,
  FilmIcon,
} from "lucide-react";
import {
  useChannelActionContext,
  useChannelStateContext,
} from "stream-chat-react";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import MembersModal from "./MembersModal";
import PinnedMessagesModal from "./PinnedMessagesModal";
import InviteModal from "./InviteModal";
import ChannelSearchModal from "./ChannelSearchModal";
import RecordingsPanel from "./RecordingsPanel";
import { useAnalyze } from "../context/AnalyzeContext";

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
  const [showRecordings, setShowRecordings] = useState(false);

  const {
    analyzeMode,
    selectedIds,
    isAnalyzing,
    enterAnalyzeMode,
    exitAnalyzeMode,
    runAnalysis,
    sentimentAnalysisEnabled,
  } = useAnalyze();

  const handleAnalyzeClick = async () => {
    if (!analyzeMode) {
      enterAnalyzeMode();
      return;
    }

    const selectedMsgs = [...selectedIds]
      .map((id) => {
        const msg = channel.state.messages.find((m) => m.id === id);
        return { id, text: msg?.text || "" };
      })
      .filter((m) => m.text.trim());

    await runAnalysis(selectedMsgs, channel.id);
  };

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
        attachments: [{ type: "video_call", callUrl }],
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
    <div className="discord-chat-header">
      <div className="discord-chat-header__left">
        <div className="flex items-center gap-2">
          {channel.data?.private ? (
            <LockIcon className="size-4 text-[#949ba4]" />
          ) : (
            <HashIcon className="size-4 text-[#949ba4]" />
          )}

          {isDM && otherUser?.user?.image && (
            <img
              src={otherUser.user.image}
              alt={otherUser.user.name || otherUser.user.id}
              className="size-7 rounded-full object-cover"
            />
          )}

          <span className="font-semibold text-[#f2f3f5]">
            {isDM
              ? otherUser?.user?.name || otherUser?.user?.id
              : channel.data?.id}
          </span>
        </div>
      </div>

      <div className="discord-chat-header__right">
        <button
          className="discord-header-btn"
          onClick={() => setShowRecordings(true)}
          title="Görüşme Kayıtları"
        >
          <FilmIcon className="size-4" />
        </button>

        {sentimentAnalysisEnabled !== false && (
          analyzeMode ? (
            <>
              <button
                className="discord-header-btn discord-header-btn--analyze-run"
                onClick={handleAnalyzeClick}
                disabled={isAnalyzing}
                title="Seçili mesajları analiz et"
              >
                {isAnalyzing ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <BrainIcon className="size-4" />
                )}
                <span className="text-sm">
                  {isAnalyzing ? "Analiz ediliyor..." : `Analiz Et${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
                </span>
              </button>
              <button
                className="discord-header-btn discord-header-btn--analyze-cancel"
                onClick={exitAnalyzeMode}
                disabled={isAnalyzing}
                title="İptal"
              >
                <span className="text-sm">✕ İptal</span>
              </button>
            </>
          ) : (
            <button
              className="discord-header-btn"
              type="button"
              title="Mesajları Analiz Et"
              onClick={handleAnalyzeClick}
            >
              <BrainIcon className="size-4" />
              <span className="text-sm">Analyze</span>
            </button>
          )
        )}

        <button
          className="discord-header-btn"
          onClick={() => setShowMembers(true)}
          title="Members"
        >
          <UsersIcon className="size-4" />
          <span className="text-sm">{memberCount}</span>
        </button>

        <button
          className="discord-header-btn"
          onClick={() => setShowSearch(true)}
          title="Search in Channel (Ctrl/Cmd + K)"
        >
          <SearchIcon className="size-4" />
        </button>

        <button
          className="discord-header-btn discord-header-btn--video"
          onClick={handleVideoCall}
          title="Start Video Call"
        >
          <VideoIcon className="size-4" />
        </button>

        {channel.data?.private && (
          <button
            className="discord-header-btn discord-header-btn--invite"
            onClick={() => setShowInvite(true)}
          >
            Invite
          </button>
        )}

        <button
          className="discord-header-btn"
          onClick={handleShowPinned}
          title="Pinned Messages"
        >
          <PinIcon className="size-4" />
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

      {showRecordings && (
        <RecordingsPanel
          channelId={channel.id}
          onClose={() => setShowRecordings(false)}
        />
      )}
    </div>
  );
};

export default CustomChannelHeader;
