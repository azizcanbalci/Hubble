import { UserButton, useUser } from "@clerk/clerk-react";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStreamChat } from "../hooks/useStreamChat";
import {
  syncMessageToMongo,
  getUserSettings,
  getMyServers,
  migrateExistingChannels,
  generateInviteCode,
} from "../lib/api";
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
import { ChevronDownIcon, PlusIcon, SettingsIcon, LinkIcon } from "lucide-react";
import CreateChannelModal from "../components/CreateChannelModal";
import CreateServerModal from "../components/CreateServerModal";
import ServerSidebar from "../components/ServerSidebar";
import CustomChannelPreview from "../components/CustomChannelPreview";
import UsersList from "../components/UsersList";
import CustomChannelHeader from "../components/CustomChannelHeader";
import VideoCallAttachment from "../components/VideoCallAttachment";
import CustomMessage from "../components/CustomMessage";
import UserSettingsModal from "../components/UserSettingsModal";
import { AnalyzeProvider } from "../context/AnalyzeContext";
import { FriendsProvider } from "../context/FriendsContext";
import FriendsList from "../components/FriendsList";
import toast from "react-hot-toast";

const CustomAttachment = (props) => {
  const videoAtt = props.attachments?.find((a) => a.type === "video_call");
  if (videoAtt) {
    return <VideoCallAttachment callUrl={videoAtt.callUrl} />;
  }
  return <Attachment {...props} />;
};

const HomePage = () => {
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isCreateServerOpen, setIsCreateServerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeChannel, setActiveChannel] = useState(null);
  const [selectedServerId, setSelectedServerId] = useState("dm");
  const [searchParams, setSearchParams] = useSearchParams();
  const migrationAttempted = useRef(false);

  const queryClient = useQueryClient();
  const { user } = useUser();
  const { chatClient, error, isLoading } = useStreamChat();

  const { data: settingsData } = useQuery({
    queryKey: ["userSettings"],
    queryFn: getUserSettings,
    staleTime: Infinity,
  });

  const { data: serversData, refetch: refetchServers } = useQuery({
    queryKey: ["servers"],
    queryFn: getMyServers,
    enabled: !!chatClient,
    staleTime: 30_000,
  });

  const servers = serversData?.servers ?? [];

  const migrateMutation = useMutation({
    mutationFn: migrateExistingChannels,
    onSuccess: ({ server }) => {
      refetchServers();
      setSelectedServerId(server.serverId);
    },
  });

  // Auto-migration: run once when chat is ready and user has no servers
  useEffect(() => {
    if (
      !chatClient ||
      migrationAttempted.current ||
      serversData === undefined // still loading
    )
      return;

    if (servers.length === 0) {
      migrationAttempted.current = true;
      migrateMutation.mutate();
    }
  }, [chatClient, serversData]);

  // Auto-select first server once migration or initial load is done
  useEffect(() => {
    if (servers.length > 0 && selectedServerId === "dm") {
      const serverParam = searchParams.get("server");
      const matched = serverParam
        ? servers.find((s) => s.serverId === serverParam)
        : null;
      setSelectedServerId(matched ? matched.serverId : servers[0].serverId);
    }
  }, [servers]);

  // Restore active channel from URL
  useEffect(() => {
    if (chatClient) {
      const channelId = searchParams.get("channel");
      if (channelId) {
        const channel = chatClient.channel("messaging", channelId);
        setActiveChannel(channel);
      }
    }
  }, [chatClient, searchParams]);

  // Sync outgoing messages to MongoDB
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
      }).catch((err) => {
        console.error("Mongo sync failed for message.new event", err);
      });
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [chatClient]);

  const sentimentAnalysisEnabled = settingsData?.settings?.sentimentAnalysisEnabled ?? true;

  const selectedServer = servers.find((s) => s.serverId === selectedServerId);

  const handleCopyInvite = async () => {
    if (!selectedServer) return;
    try {
      const { code } = await generateInviteCode(selectedServer.serverId);
      const inviteUrl = `${window.location.origin}/invite/${code}`;
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Davet linki kopyalandı!");
    } catch {
      toast.error("Davet linki oluşturulamadı");
    }
  };

  const handleServerCreated = (server) => {
    queryClient.invalidateQueries({ queryKey: ["servers"] });
    setSelectedServerId(server.serverId);
  };

  const handleServerJoined = (server) => {
    queryClient.invalidateQueries({ queryKey: ["servers"] });
    setSelectedServerId(server.serverId);
  };

  if (error) return <p>Something went wrong...</p>;
  if (isLoading || !chatClient) return <PageLoader />;

  const channelListFilters =
    selectedServerId && selectedServerId !== "dm"
      ? { serverId: { $eq: selectedServerId }, members: { $in: [chatClient?.user?.id] } }
      : null;

  return (
    <div className="discord-app">
      <Chat client={chatClient}>
      <FriendsProvider enabled={!!chatClient}>
        {/* Server Sidebar */}
        <ServerSidebar
          servers={servers}
          selectedServerId={selectedServerId}
          onSelectServer={(id) => {
            setSelectedServerId(id);
            setActiveChannel(null);
            setSearchParams({});
          }}
          onOpenCreateModal={() => setIsCreateServerOpen(true)}
        />

        {/* Channel Sidebar */}
        <div className="discord-channel-sidebar">
          <div className="discord-server-header">
            <span className="discord-server-header__name">
              {selectedServerId === "dm" ? "Direkt Mesajlar" : (selectedServer?.name ?? "Hubble")}
            </span>

            <div className="discord-server-header__actions">
              {/* Invite link for server owners/admins */}
              {selectedServer &&
                selectedServer.members.some(
                  (m) => m.userId === user?.id && m.role !== "member"
                ) && (
                  <button
                    className="discord-server-header__add"
                    onClick={handleCopyInvite}
                    title="Davet Linki Kopyala"
                  >
                    <LinkIcon className="size-4" />
                  </button>
                )}

              {/* Add channel button (only in server mode) */}
              {selectedServerId !== "dm" && (
                <button
                  className="discord-server-header__add"
                  onClick={() => setIsCreateChannelOpen(true)}
                  title="Kanal Oluştur"
                >
                  <PlusIcon className="size-4" />
                </button>
              )}
            </div>
          </div>

          <div className="discord-channel-list-body">
            {selectedServerId !== "dm" && channelListFilters ? (
              <ChannelList
                key={selectedServerId}
                filters={channelListFilters}
                options={{ state: true, watch: true }}
                Preview={({ channel }) => (
                  <CustomChannelPreview
                    channel={channel}
                    activeChannel={activeChannel}
                    setActiveChannel={(ch) => setSearchParams({ channel: ch.id })}
                  />
                )}
                List={({ children, loading, error: listError }) => (
                  <>
                    <div className="discord-section-header">
                      <ChevronDownIcon className="size-3" />
                      <span>Kanallar</span>
                    </div>
                    {loading && <p className="discord-section-message">Yükleniyor...</p>}
                    {listError && (
                      <p className="discord-section-message discord-section-message--error">
                        Kanallar yüklenemedi
                      </p>
                    )}
                    <div>{children}</div>
                  </>
                )}
              />
            ) : (
              /* DM mode — header only, UsersList below */
              <div className="discord-section-header">
                <ChevronDownIcon className="size-3" />
                <span>Direkt Mesajlar</span>
              </div>
            )}

            {/* DMs always visible, label context-aware */}
            {selectedServerId === "dm" && (
              <>
                <FriendsList activeChannel={activeChannel} />
                <UsersList activeChannel={activeChannel} />
              </>
            )}
          </div>

          {/* Bottom bar: settings + avatar */}
          <div className="discord-channel-sidebar__bottom">
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

        {/* Main Chat */}
        <div className="discord-chat-main">
          <Channel channel={activeChannel} Attachment={CustomAttachment}>
            <AnalyzeProvider
              channelId={activeChannel?.id}
              sentimentAnalysisEnabled={sentimentAnalysisEnabled}
            >
              <Window>
                <CustomChannelHeader />
                <MessageList Message={CustomMessage} />
                <MessageInput />
              </Window>
              <Thread />
            </AnalyzeProvider>
          </Channel>
        </div>

        {isCreateChannelOpen && (
          <CreateChannelModal
            serverId={selectedServerId !== "dm" ? selectedServerId : undefined}
            onClose={() => setIsCreateChannelOpen(false)}
          />
        )}

        {isCreateServerOpen && (
          <CreateServerModal
            onClose={() => setIsCreateServerOpen(false)}
            onServerCreated={handleServerCreated}
            onServerJoined={handleServerJoined}
          />
        )}

        {showSettings && (
          <UserSettingsModal onClose={() => setShowSettings(false)} />
        )}
      </FriendsProvider>
      </Chat>
    </div>
  );
};

export default HomePage;
