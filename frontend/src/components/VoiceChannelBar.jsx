import { useCall, useCallStateHooks } from "@stream-io/video-react-sdk";
import { MicIcon, MicOffIcon, PhoneOffIcon, Volume2Icon } from "lucide-react";

const VoiceChannelBar = ({ channelName, onDisconnect }) => {
  const call = useCall();
  const { useMicrophoneState } = useCallStateHooks();
  const { microphone, isMute: isMicMuted } = useMicrophoneState();

  const handleLeave = async () => {
    try {
      await call.leave();
    } catch {
      // ignore
    }
    onDisconnect();
  };

  return (
    <div className="vc-bar">
      <div className="vc-bar__status">
        <Volume2Icon className="size-3" style={{ color: "#23a55a" }} />
        <span style={{ fontSize: 11, color: "#23a55a", fontWeight: 600, letterSpacing: "0.02em" }}>
          Ses · Bağlandı
        </span>
      </div>

      <div className="vc-bar__controls">
        <span className="vc-bar__channel-name">{channelName}</span>

        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={() => microphone.toggle()}
            title={isMicMuted ? "Sesi Aç" : "Sesi Kapat"}
            className={`vc-bar__btn ${isMicMuted ? "vc-bar__btn--muted" : ""}`}
          >
            {isMicMuted ? (
              <MicOffIcon className="size-4" />
            ) : (
              <MicIcon className="size-4" />
            )}
          </button>

          <button
            onClick={handleLeave}
            title="Ayrıl"
            className="vc-bar__btn vc-bar__btn--leave"
          >
            <PhoneOffIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceChannelBar;
