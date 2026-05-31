import { UserButton, useClerk } from "@clerk/clerk-react";
import { useAppAuth } from "../context/AppAuthContext";
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

import {
  ChevronDownIcon,
  PlusIcon,
  SettingsIcon,
  LinkIcon,
  HashIcon,
  SunIcon,
  MoonIcon,
  MessageSquareIcon,
} from "lucide-react";
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
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";

const CustomAttachment = (props) => {
  const videoAtt = props.attachments?.find((a) => a.type === "video_call");
  if (videoAtt) {
    return <VideoCallAttachment callUrl={videoAtt.callUrl} />;
  }
  return <Attachment {...props} />;
};

const NoChannelPlaceholder = () => (
  <div
    className="flex flex-1 flex-col items-center justify-center gap-8 select-none"
    style={{ background: "var(--ds-chat-bg)" }}
  >
    <div className="relative">
      <div
        className="flex h-28 w-28 items-center justify-center rounded-[28px]"
        style={{ background: "var(--ds-sidebar-bg)", border: "1px solid var(--ds-border)" }}
      >
        <HashIcon
          className="h-14 w-14"
          strokeWidth={1.5}
          style={{ color: "var(--ds-text-muted)" }}
        />
      </div>
      <div
        className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full shadow-lg"
        style={{ background: "var(--ds-accent)" }}
      >
        <MessageSquareIcon className="h-4 w-4 text-white" />
      </div>
    </div>

    <div className="text-center max-w-xs px-4">
      <h2
        className="mb-2 text-xl font-bold"
        style={{ color: "var(--ds-text-active)" }}
      >
        Henüz bir sohbet seçilmedi
      </h2>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--ds-text-muted)" }}
      >
        Sol panelden bir kanal veya arkadaş seçerek sohbete başlayabilirsiniz
      </p>
    </div>

    <div
      className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs"
      style={{
        background: "var(--ds-sidebar-bg)",
        color: "var(--ds-text-muted)",
        border: "1px solid var(--ds-border)",
      }}
    >
      <kbd
        style={{
          background: "var(--ds-input-bg)",
          color: "var(--ds-text-normal)",
          borderRadius: 4,
          padding: "1px 6px",
          fontSize: 11,
          fontFamily: "monospace",
          border: "1px solid var(--ds-border)",
        }}
      >
        Ctrl+K
      </kbd>
      <span>ile kanal arayabilirsiniz</span>
    </div>
  </div>
);

const HomePage = () => {
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isCreateServerOpen, setIsCreateServerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeChannel, setActiveChannel] = useState(null);
  const [selectedServerId, setSelectedServerId] = useState("dm");
  const [searchParams, setSearchParams] = useSearchParams();
  const migrationAttempted = useRef(false);

  const queryClient = useQueryClient();
  const { currentUser: user, isCustomSignedIn, logoutCustom } = useAppAuth();
  const { signOut: clerkSignOut } = useClerk();
  const { chatClient, error, isLoading } = useStreamChat();
  const { theme, toggle: toggleTheme } = useTheme();

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

          {/* Bottom bar: theme toggle + settings + avatar */}
          <div className="discord-channel-sidebar__bottom">
            {/* Theme toggle */}
            <button
              className="discord-server-icon discord-server-icon--settings"
              onClick={toggleTheme}
              title={theme === "dark" ? "Açık Mod" : "Koyu Mod"}
            >
              {theme === "dark" ? (
                <SunIcon className="size-4" />
              ) : (
                <MoonIcon className="size-4" />
              )}
            </button>

            <button
              className="discord-server-icon discord-server-icon--settings"
              onClick={() => setShowSettings(true)}
              title="Ayarlar"
            >
              <SettingsIcon className="size-5" />
            </button>

            {isCustomSignedIn ? (
              <button
                onClick={logoutCustom}
                title="Çıkış Yap"
                style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #7209b7, #533483)",
                  border: "none",
                  cursor: "pointer",
                  color: "white",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {user?.image ? (
                  <img src={user.image} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  (user?.name?.[0] || "?").toUpperCase()
                )}
              </button>
            ) : (
              <UserButton />
            )}
          </div>
        </div>

        {/* Main Chat */}
        <div className="discord-chat-main">
          {activeChannel ? (
            <Channel channel={activeChannel} Attachment={CustomAttachment}>
              <AnalyzeProvider
                channelId={activeChannel.id}
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
          ) : (
            <NoChannelPlaceholder />
          )}
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
