import { useCallStateHooks, ParticipantView } from "@stream-io/video-react-sdk";
import { Volume2Icon, MicOffIcon, UsersIcon } from "lucide-react";

const VoiceAvatarPlaceholder = ({ participant }) => {
  const isSpeaking = participant.isSpeaking;
  const isMuted = participant.isMute;
  const name = participant.name || participant.userId || "Kullanıcı";
  const image = participant.image;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        height: "100%",
        padding: 16,
        background: "var(--ds-sidebar-bg)",
        border: `2px solid ${isSpeaking ? "#23a55a" : "transparent"}`,
        borderRadius: 8,
        transition: "border-color 0.15s",
        boxSizing: "border-box",
      }}
    >
      {image ? (
        <img
          src={image}
          alt={name}
          style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "var(--ds-accent)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {name[0].toUpperCase()}
        </div>
      )}
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--ds-text-normal)",
          textAlign: "center",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
      {isMuted && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <MicOffIcon style={{ width: 12, height: 12, color: "#f23f43" }} />
          <span style={{ fontSize: 11, color: "#f23f43" }}>Sessiz</span>
        </div>
      )}
    </div>
  );
};

const VoiceChannelView = ({ channelName }) => {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  return (
    <div
      className="discord-chat-main"
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--ds-chat-bg)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div className="discord-chat-header">
        <div className="discord-chat-header__left">
          <Volume2Icon className="size-4" style={{ color: "var(--ds-text-muted)" }} />
          <span className="font-semibold" style={{ color: "var(--ds-text-active)" }}>
            {channelName}
          </span>
        </div>
        <div className="discord-chat-header__right">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--ds-text-muted)",
              fontSize: 13,
            }}
          >
            <UsersIcon className="size-4" />
            <span>{participants.length} katılımcı</span>
          </div>
        </div>
      </div>

      {/* Participant grid */}
      <div style={{ flex: 1, padding: 32, overflowY: "auto" }}>
        {participants.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 16,
              color: "var(--ds-text-muted)",
              textAlign: "center",
            }}
          >
            <Volume2Icon className="size-16" style={{ opacity: 0.3 }} />
            <div>
              <p style={{ fontWeight: 600, color: "var(--ds-text-normal)", marginBottom: 4 }}>
                Ses Kanalı — {channelName}
              </p>
              <p style={{ fontSize: 13 }}>
                Henüz kimse bağlı değil. Siz bağlanarak başlayabilirsiniz.
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 16,
              alignContent: "start",
            }}
          >
            {participants.map((p) => (
              <div
                key={p.sessionId}
                style={{ aspectRatio: "1", minHeight: 160 }}
              >
                <ParticipantView
                  participant={p}
                  VideoPlaceholder={({ participant }) => (
                    <VoiceAvatarPlaceholder participant={participant} />
                  )}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceChannelView;
