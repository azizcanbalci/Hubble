import { UserButton } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useStreamChat } from "../hooks/useStreamChat";
import { syncMessageToMongo, getUserSettings } from "../lib/api";
import PageLoader from "../components/PageLoader";

import {
  Attachment,
  Chat,
  Channel,
  ChannelList,
  MessageList,
  MessageInput,
  Thread,
  Window,
} from "stream-chat-react";

import "../styles/stream-chat-theme.css";
import { ChevronDownIcon, PlusIcon, SettingsIcon } from "lucide-react";
import CreateChannelModal from "../components/CreateChannelModal";
import CustomChannelPreview from "../components/CustomChannelPreview";
import UsersList from "../components/UsersList";
import CustomChannelHeader from "../components/CustomChannelHeader";
import VideoCallAttachment from "../components/VideoCallAttachment";
import CustomMessage from "../components/CustomMessage";
import UserSettingsModal from "../components/UserSettingsModal";
import { AnalyzeProvider } from "../context/AnalyzeContext";

const CustomAttachment = (props) => {
  const videoAtt = props.attachments?.find((a) => a.type === "video_call");
  if (videoAtt) {
    return <VideoCallAttachment callUrl={videoAtt.callUrl} />;
  }
  return <Attachment {...props} />;
};

const HomePage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeChannel, setActiveChannel] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const { chatClient, error, isLoading } = useStreamChat();

  const { data: settingsData } = useQuery({
    queryKey: ["userSettings"],
    queryFn: getUserSettings,
    staleTime: Infinity,
  });

  const sentimentAnalysisEnabled = settingsData?.settings?.sentimentAnalysisEnabled ?? true;

  useEffect(() => {
    if (chatClient) {
      const channelId = searchParams.get("channel");
      if (channelId) {
        const channel = chatClient.channel("messaging", channelId);
        setActiveChannel(channel);
      }
    }
  }, [chatClient, searchParams]);

  useEffect(() => {
    if (!chatClient) return;

    const subscription = chatClient.on((event) => {
      if (event.type !== "message.new" || !event.message) return;
      if (event.message.user?.id !== chatClient.userID) return;

      const [channelType, channelId] = (event.cid || "messaging:").split(":");

      syncMessageToMongo({
        message: event.message,
        channel: {
          id: channelId,
          type: channelType || "messaging",
        },
      }).catch((error) => {
        console.error("Mongo sync failed for message.new event", error);
      });
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [chatClient]);

  if (error) return <p>Something went wrong...</p>;
  if (isLoading || !chatClient) return <PageLoader />;

  return (
    <div className="discord-app">
      <Chat client={chatClient}>
        {/* Server Sidebar */}
        <div className="discord-server-sidebar">
          <div className="discord-server-icon">
            <img src="/logo.png" alt="Hubble" />
          </div>
          <div className="discord-server-separator" />
          <div className="discord-server-sidebar__bottom">
            <button
              className="discord-server-icon discord-server-icon--settings"
              onClick={() => setShowSettings(true)}
              title="Ayarlar"
            >
              <SettingsIcon className="size-5" />
            </button>
            <UserButton />
          </div>
        </div>

        {/* Channel Sidebar */}
        <div className="discord-channel-sidebar">
          <div className="discord-server-header">
            <span className="discord-server-header__name">Hubble</span>
            <button
              className="discord-server-header__add"
              onClick={() => setIsCreateModalOpen(true)}
              title="Create Channel"
            >
              <PlusIcon className="size-4" />
            </button>
          </div>

          <div className="discord-channel-list-body">
            <ChannelList
              filters={{ members: { $in: [chatClient?.user?.id] } }}
              options={{ state: true, watch: true }}
              Preview={({ channel }) => (
                <CustomChannelPreview
                  channel={channel}
                  activeChannel={activeChannel}
                  setActiveChannel={(channel) =>
                    setSearchParams({ channel: channel.id })
                  }
                />
              )}
              List={({ children, loading, error }) => (
                <>
                  <div className="discord-section-header">
                    <ChevronDownIcon className="size-3" />
                    <span>Text Channels</span>
                  </div>
                  {loading && <p className="discord-section-message">Loading...</p>}
                  {error && (
                    <p className="discord-section-message discord-section-message--error">
                      Error loading channels
                    </p>
                  )}
                  <div>{children}</div>

                  <div className="discord-section-header" style={{ marginTop: "16px" }}>
                    <ChevronDownIcon className="size-3" />
                    <span>Direct Messages</span>
                  </div>
                  <UsersList activeChannel={activeChannel} />
                </>
              )}
            />
          </div>
        </div>

        {/* Main Chat */}
        <div className="discord-chat-main">
          <Channel channel={activeChannel} Attachment={CustomAttachment}>
            <AnalyzeProvider channelId={activeChannel?.id} sentimentAnalysisEnabled={sentimentAnalysisEnabled}>
              <Window>
                <CustomChannelHeader />
                <MessageList Message={CustomMessage} />
                <MessageInput />
              </Window>
              <Thread />
            </AnalyzeProvider>
          </Channel>
        </div>

        {isCreateModalOpen && (
          <CreateChannelModal onClose={() => setIsCreateModalOpen(false)} />
        )}

        {showSettings && (
          <UserSettingsModal onClose={() => setShowSettings(false)} />
        )}
      </Chat>
    </div>
  );
};

export default HomePage;
