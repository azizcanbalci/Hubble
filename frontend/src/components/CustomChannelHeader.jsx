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
import { useAppAuth } from "../context/AppAuthContext";
import MembersModal from "./MembersModal";
import PinnedMessagesModal from "./PinnedMessagesModal";
import InviteModal from "./InviteModal";
import ChannelSearchModal from "./ChannelSearchModal";
import RecordingsPanel from "./RecordingsPanel";
import { useAnalyze } from "../context/AnalyzeContext";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CustomChannelHeader = () => {
  const { channel } = useChannelStateContext();
  const { jumpToMessage } = useChannelActionContext();
  const { currentUser: user } = useAppAuth();

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
    (member) => member.user.id !== user.id
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
    if (typeof jumpToMessage === "function") jumpToMessage(messageId);
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
    <TooltipProvider delayDuration={300}>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRecordings(true)}
                className="size-8 text-[#949ba4] hover:text-[#dcddde]"
              >
                <FilmIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Görüşme Kayıtları</TooltipContent>
          </Tooltip>

          {sentimentAnalysisEnabled !== false && (
            analyzeMode ? (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAnalyzeClick}
                  disabled={isAnalyzing}
                  className="h-8 gap-1.5 text-xs"
                >
                  {isAnalyzing ? (
                    <LoaderIcon className="size-3.5 animate-spin" />
                  ) : (
                    <BrainIcon className="size-3.5" />
                  )}
                  {isAnalyzing
                    ? "Analiz ediliyor..."
                    : `Analiz Et${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exitAnalyzeMode}
                  disabled={isAnalyzing}
                  className="h-8 text-xs text-[#f23f43] hover:text-[#f23f43] hover:bg-[#f23f43]/10"
                >
                  ✕ İptal
                </Button>
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAnalyzeClick}
                    className="h-8 gap-1.5 text-xs text-[#949ba4] hover:text-[#dcddde]"
                  >
                    <BrainIcon className="size-3.5" />
                    Analyze
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mesajları Analiz Et</TooltipContent>
              </Tooltip>
            )
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMembers(true)}
                className="h-8 gap-1.5 text-xs text-[#949ba4] hover:text-[#dcddde]"
              >
                <UsersIcon className="size-3.5" />
                <span>{memberCount}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Üyeler</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSearch(true)}
                className="size-8 text-[#949ba4] hover:text-[#dcddde]"
              >
                <SearchIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Kanalda Ara (Ctrl+K)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVideoCall}
                className="size-8 text-green-500 hover:text-green-400 hover:bg-green-500/10"
              >
                <VideoIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Video Görüşme Başlat</TooltipContent>
          </Tooltip>

          {channel.data?.private && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowInvite(true)}
                  className="h-8 text-xs"
                >
                  Davet Et
                </Button>
              </TooltipTrigger>
              <TooltipContent>Kullanıcı Davet Et</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShowPinned}
                className="size-8 text-[#949ba4] hover:text-[#dcddde]"
              >
                <PinIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sabitlenmiş Mesajlar</TooltipContent>
          </Tooltip>
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
    </TooltipProvider>
  );
};

export default CustomChannelHeader;
