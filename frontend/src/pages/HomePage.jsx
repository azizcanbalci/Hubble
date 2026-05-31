import "@stream-io/video-react-sdk/dist/css/styles.css";
import { UserButton, useClerk } from "@clerk/clerk-react";
import { useAppAuth } from "../context/AppAuthContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStreamChat } from "../hooks/useStreamChat";
import { useStreamVideo } from "../hooks/useStreamVideo";
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

import { StreamVideo, StreamCall, useCallStateHooks, CallingState } from "@stream-io/video-react-sdk";

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
import VoiceChannelPreview from "../components/VoiceChannelPreview";
import VoiceChannelBar from "../components/VoiceChannelBar";
import VoiceChannelView from "../components/VoiceChannelView";
import { AnalyzeProvider } from "../context/AnalyzeContext";
import { FriendsProvider } from "../context/FriendsContext";
import FriendsList from "../components/FriendsList";
import { useTheme } from "../context/ThemeContext";
import { useDesktopNotifications } from "../hooks/useDesktopNotifications";
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

// Tracks participants and calling state inside StreamCall context
const VoiceParticipantTracker = ({ onParticipants, onDisconnect }) => {
  const { useParticipants, useCallCallingState } = useCallStateHooks();
  const participants = useParticipants();
  const callingState = useCallCallingState();

  useEffect(() => {
    onParticipants(participants);
  }, [participants, onParticipants]);

  // Handle unexpected disconnects (network drop, server-side kick, etc.)
  useEffect(() => {
    if (callingState === CallingState.LEFT) {
      onDisconnect();
    }
  }, [callingState, onDisconnect]);

  return null;
};

const HomePage = () => {
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isCreateServerOpen, setIsCreateServerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeChannel, setActiveChannel] = useState(null);
  const [selectedServerId, setSelectedServerId] = useState("dm");
  const [searchParams, setSearchParams] = useSearchParams();
  const migrationAttempted = useRef(false);
  const activeChannelRef = useRef(null);

  // Voice channel state
  const [voiceChannels, setVoiceChannels] = useState([]);
  const [connectedVoiceChannel, setConnectedVoiceChannel] = useState(null);
  const [activeVoiceCall, setActiveVoiceCall] = useState(null);
  const [voiceParticipants, setVoiceParticipants] = useState([]);
  // Polled participants for ALL voice channels (keyed by channel id)
  const [voiceChannelParticipants, setVoiceChannelParticipants] = useState({});

  const queryClient = useQueryClient();
  const { currentUser: user, isCustomSignedIn, logoutCustom } = useAppAuth();
  const { signOut: clerkSignOut } = useClerk();
  const { chatClient, error, isLoading } = useStreamChat();
  const { videoClient } = useStreamVideo();
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
      serversData === undefined
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

  // Fetch voice channels for the selected server
  useEffect(() => {
    if (!chatClient || !selectedServerId || selectedServerId === "dm") {
      setVoiceChannels([]);
      return;
    }

    chatClient
      .queryChannels(
        {
          serverId: { $eq: selectedServerId },
          members: { $in: [chatClient.user.id] },
        },
        [{ created_at: 1 }],
        { state: true, watch: true, limit: 100 }
      )
      .then((channels) => {
        setVoiceChannels(channels.filter((ch) => ch.data?.channelType === "voice"));
      })
      .catch(() => setVoiceChannels([]));
  }, [chatClient, selectedServerId]);

  // Poll participants for ALL voice channels every 5 seconds
  useEffect(() => {
    if (!videoClient || voiceChannels.length === 0) {
      setVoiceChannelParticipants({});
      return;
    }

    let isMounted = true;

    const fetchAll = async () => {
      const updates = {};
      for (const ch of voiceChannels) {
        try {
          const call = videoClient.call("default", ch.id);
          const { call: callData } = await call.get();
          const sessionParticipants = callData.session?.participants ?? [];
          updates[ch.id] = sessionParticipants.map((p) => ({
            sessionId: p.user_session_id || p.user?.id || String(Math.random()),
            userId: p.user?.id || "",
            name: p.user?.name || p.user?.id || "Kullanıcı",
            image: p.user?.image || null,
            isSpeaking: false,
            isMute: false,
          }));
        } catch {
          updates[ch.id] = [];
        }
      }
      if (isMounted) setVoiceChannelParticipants(updates);
    };

    fetchAll();
    const interval = setInterval(fetchAll, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [videoClient, voiceChannels]);

  // Sync outgoing messages to MongoDB + clear draft on send
  useEffect(() => {
    if (!chatClient) return;

    const subscription = chatClient.on((event) => {
      if (event.type !== "message.new" || !event.message) return;
      if (event.message.user?.id !== chatClient.userID) return;

      const [channelType, channelId] = (event.cid || "messaging:").split(":");

      localStorage.removeItem(`hubble_draft_${channelId}`);

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

  // Draft: save as user types
  useEffect(() => {
    if (!activeChannel) return;
    const save = (e) => {
      if (!e.target.matches?.(".discord-chat-main textarea")) return;
      const text = e.target.value;
      const key = `hubble_draft_${activeChannel.id}`;
      text.trim() ? localStorage.setItem(key, text) : localStorage.removeItem(key);
    };
    document.addEventListener("input", save);
    return () => document.removeEventListener("input", save);
  }, [activeChannel?.id]);

  // Draft: restore when channel changes
  useEffect(() => {
    if (!activeChannel) return;
    const draft = localStorage.getItem(`hubble_draft_${activeChannel.id}`);
    if (!draft) return;
    const t = setTimeout(() => {
      const textarea = document.querySelector(".discord-chat-main textarea");
      if (!textarea) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      setter.call(textarea, draft);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }, 150);
    return () => clearTimeout(t);
  }, [activeChannel?.id]);

  const sentimentAnalysisEnabled = settingsData?.settings?.sentimentAnalysisEnabled ?? true;

  useEffect(() => { activeChannelRef.current = activeChannel?.id ?? null; }, [activeChannel]);

  useDesktopNotifications(chatClient, settingsData?.settings, activeChannelRef);

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

  const handleJoinVoice = async (channel) => {
    if (!videoClient) return;
    if (connectedVoiceChannel?.id === channel.id) return;

    if (activeVoiceCall) {
      await activeVoiceCall.leave().catch(() => {});
      setActiveVoiceCall(null);
      setConnectedVoiceChannel(null);
      setVoiceParticipants([]);
    }

    try {
      const call = videoClient.call("default", channel.id);
      await call.join({ create: true });
      // Voice channel: ensure camera is always off (mic stays on)
      await call.camera.disable().catch(() => {});
      setActiveVoiceCall(call);
      setConnectedVoiceChannel({ id: channel.id, name: channel.data?.name || channel.id });
    } catch {
      toast.error("Ses kanalına bağlanılamadı.");
    }
  };

  const handleVoiceDisconnect = () => {
    setActiveVoiceCall(null);
    setConnectedVoiceChannel(null);
    setVoiceParticipants([]);
  };

  const handleParticipants = useCallback((participants) => {
    setVoiceParticipants(participants);
  }, []);

  const handleSelectServer = async (id) => {
    if (activeVoiceCall) {
      await activeVoiceCall.leave().catch(() => {});
      setActiveVoiceCall(null);
      setConnectedVoiceChannel(null);
      setVoiceParticipants([]);
    }
    setSelectedServerId(id);
    setActiveChannel(null);
    setSearchParams({});
  };

  if (error) return <p>Something went wrong...</p>;
  if (isLoading || !chatClient) return <PageLoader />;

  const channelListFilters =
    selectedServerId && selectedServerId !== "dm"
      ? { serverId: { $eq: selectedServerId }, members: { $in: [chatClient?.user?.id] } }
      : null;

  const appLayout = (
    <div className="discord-app">
      <Chat client={chatClient}>
        <FriendsProvider enabled={!!chatClient}>
          {/* Server Sidebar */}
          <ServerSidebar
            servers={servers}
            selectedServerId={selectedServerId}
            onSelectServer={handleSelectServer}
            onOpenCreateModal={() => setIsCreateServerOpen(true)}
          />

          {/* Channel Sidebar */}
          <div className="discord-channel-sidebar">
            <div className="discord-server-header">
              <span className="discord-server-header__name">
                {selectedServerId === "dm" ? "Direkt Mesajlar" : (selectedServer?.name ?? "Hubble")}
              </span>

              <div className="discord-server-header__actions">
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
                <>
                  {/* Text channels */}
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
                          <span>Metin Kanalları</span>
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

                  {/* Voice channels */}
                  {voiceChannels.length > 0 && (
                    <div>
                      <div className="discord-section-header">
                        <ChevronDownIcon className="size-3" />
                        <span>Ses Kanalları</span>
                      </div>
                      {voiceChannels.map((ch) => (
                        <VoiceChannelPreview
                          key={ch.id}
                          channel={ch}
                          isActive={connectedVoiceChannel?.id === ch.id}
                          onJoin={handleJoinVoice}
                          participants={
                            connectedVoiceChannel?.id === ch.id
                              ? voiceParticipants
                              : (voiceChannelParticipants[ch.id] || [])
                          }
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="discord-section-header">
                  <ChevronDownIcon className="size-3" />
                  <span>Direkt Mesajlar</span>
                </div>
              )}

              {selectedServerId === "dm" && (
                <>
                  <FriendsList activeChannel={activeChannel} />
                  <UsersList activeChannel={activeChannel} />
                </>
              )}
            </div>

            {/* Voice bar — shown when in a voice channel */}
            {activeVoiceCall && connectedVoiceChannel && (
              <VoiceChannelBar
                channelName={connectedVoiceChannel.name}
                onDisconnect={handleVoiceDisconnect}
              />
            )}

            {/* Bottom bar: theme toggle + settings + avatar */}
            <div className="discord-channel-sidebar__bottom">
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

          {/* Main panel */}
          {activeVoiceCall && connectedVoiceChannel ? (
            <VoiceChannelView channelName={connectedVoiceChannel.name} />
          ) : (
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
          )}

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

  if (!videoClient) return appLayout;

  return (
    <StreamVideo client={videoClient}>
      {activeVoiceCall ? (
        <StreamCall call={activeVoiceCall}>
          <VoiceParticipantTracker onParticipants={handleParticipants} onDisconnect={handleVoiceDisconnect} />
          {appLayout}
        </StreamCall>
      ) : (
        appLayout
      )}
    </StreamVideo>
  );
};

export default HomePage;
