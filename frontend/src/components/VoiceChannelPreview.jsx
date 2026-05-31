import { Volume2Icon, MicOffIcon } from "lucide-react";

const VoiceChannelPreview = ({ channel, isActive, onJoin, participants = [] }) => {
  const channelName = channel.data?.name || channel.id;

  return (
    <div className="vc-preview-wrapper">
      <button
        onClick={() => onJoin(channel)}
        className={`discord-channel-item ${isActive ? "active" : ""}`}
      >
        <Volume2Icon className="channel-icon size-4" />
        <span className="flex-1 truncate text-left">{channelName}</span>
      </button>

      {participants.map((p) => {
        const name = p.name || p.userId || "?";
        const image = p.image || null;
        const speaking = p.isSpeaking;

        return (
          <div key={p.sessionId || p.userId} className="vc-sidebar-participant">
            <div className="vc-sidebar-participant__avatar-wrap">
              {image ? (
                <img
                  src={image}
                  alt={name}
                  className={`vc-sidebar-participant__avatar ${speaking ? "vc-sidebar-participant__avatar--speaking" : ""}`}
                />
              ) : (
                <div
                  className={`vc-sidebar-participant__avatar vc-sidebar-participant__avatar--placeholder ${speaking ? "vc-sidebar-participant__avatar--speaking" : ""}`}
                >
                  {name[0].toUpperCase()}
                </div>
              )}
            </div>
            <span className="flex-1 truncate text-xs">{name}</span>
            {p.isMute && (
              <MicOffIcon className="size-3 shrink-0" style={{ color: "#f23f43" }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default VoiceChannelPreview;
