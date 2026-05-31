import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAppAuth } from "../context/AppAuthContext";
import toast from "react-hot-toast";

import { getStreamToken } from "../lib/api";

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  StreamTheme,
  CallingState,
  useCallStateHooks,
  useCall,
  ParticipantView,
} from "@stream-io/video-react-sdk";

import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  MonitorIcon,
  MonitorOffIcon,
  CircleIcon,
  SquareIcon,
  PhoneOffIcon,
  LoaderIcon,
  Maximize2Icon,
  Minimize2Icon,
  PinIcon,
} from "lucide-react";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import "../styles/call-page.css";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

/* ─── Page shell ─────────────────────────────────────────────── */
const CallPage = () => {
  const { id: callId } = useParams();
  const { currentUser: user, isLoaded } = useAppAuth();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!user,
  });

  useEffect(() => {
    if (!tokenData?.token || !user || !callId) return;

    let videoClient = null;
    let isMounted = true;

    const initCall = async () => {
      try {
        videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user: { id: user.id, name: user.name, image: user.image },
          token: tokenData.token,
        });
        const callInstance = videoClient.call("default", callId);
        await callInstance.join({ create: true });
        if (!isMounted) {
          await callInstance.leave();
          return;
        }
        setClient(videoClient);
        setCall(callInstance);
      } catch (err) {
        console.error(err);
        if (isMounted) toast.error("Görüşmeye bağlanılamadı.");
      } finally {
        if (isMounted) setIsConnecting(false);
      }
    };

    initCall();
    return () => {
      isMounted = false;
    };
  }, [tokenData, user, callId]);

  if (isConnecting || !isLoaded) {
    return (
      <div className="dc-shell dc-shell--loading">
        <div className="dc-loading-card">
          <VideoIcon className="dc-loading-icon" />
          <p>Görüşmeye bağlanılıyor…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dc-shell">
      {client && call ? (
        <StreamVideo client={client}>
          <StreamCall call={call}>
            <CallContent />
          </StreamCall>
        </StreamVideo>
      ) : (
        <p className="dc-shell__error">
          Bağlantı kurulamadı, lütfen sayfayı yenileyin.
        </p>
      )}
    </div>
  );
};

/* ─── Main call UI ───────────────────────────────────────────── */
const CallContent = () => {
  const call = useCall();
  const containerRef = useRef(null);
  const [pinnedId, setPinnedId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recordLoading, setRecordLoading] = useState(false);
  const navigate = useNavigate();

  const {
    useCallCallingState,
    useParticipants,
    useMicrophoneState,
    useCameraState,
    useScreenShareState,
    useIsCallRecordingInProgress,
  } = useCallStateHooks();

  const callingState = useCallCallingState();
  const participants = useParticipants();
  const { microphone, isMute: isMicMuted } = useMicrophoneState();
  const { camera, isMute: isCamMuted } = useCameraState();
  const { screenShare, isMute: isScreenShareOff } = useScreenShareState();
  const isRecording = useIsCallRecordingInProgress();
  const isScreenSharing = !isScreenShareOff;

  /* navigate away when call ends — must be in useEffect, not render */
  useEffect(() => {
    if (callingState === CallingState.LEFT) {
      navigate("/");
    }
  }, [callingState, navigate]);

  /* fullscreen listener */
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  /* pin logic */
  const pinned = pinnedId ? participants.find((p) => p.sessionId === pinnedId) : null;
  const others = pinnedId ? participants.filter((p) => p.sessionId !== pinnedId) : [];

  const togglePin = (sessionId) =>
    setPinnedId((prev) => (prev === sessionId ? null : sessionId));

  /* fullscreen */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  /* recording */
  const handleRecord = async () => {
    setRecordLoading(true);
    try {
      if (isRecording) {
        await call.stopRecording();
        toast.success("Kayıt durduruldu");
      } else {
        await call.startRecording();
        toast.success("Kayıt başlatıldı");
      }
    } catch {
      toast.error("Kayıt işlemi başarısız");
    } finally {
      setRecordLoading(false);
    }
  };

  /* screen share */
  const handleScreenShare = async () => {
    try {
      await screenShare.toggle();
    } catch {
      toast.error("Ekran paylaşımı başlatılamadı");
    }
  };

  /* grid class by count */
  const gridClass = pinnedId
    ? "dc-grid dc-grid--pinned"
    : `dc-grid dc-grid--${Math.min(participants.length, 9)}`;

  return (
    <div className="dc-call" ref={containerRef}>
      {/* ── video area ── */}
      <div className="dc-video-area">
        <StreamTheme>
          {pinnedId ? (
            /* ── pinned mode ── */
            <div className={gridClass}>
              <div className="dc-tile dc-tile--main" onClick={() => togglePin(pinnedId)}>
                {pinned && <ParticipantView participant={pinned} />}
                <div className="dc-tile__unpin-hint">
                  <PinIcon className="size-3.5" /> Sabitlemeyi kaldır
                </div>
              </div>
              {others.length > 0 && (
                <div className="dc-sidebar">
                  {others.map((p) => (
                    <div
                      key={p.sessionId}
                      className="dc-tile dc-tile--thumb"
                      onClick={() => togglePin(p.sessionId)}
                      title="Büyütmek için tıkla"
                    >
                      <ParticipantView participant={p} />
                      <div className="dc-tile__pin-hint">
                        <PinIcon className="size-3" /> Sabitle
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── grid mode ── */
            <div className={gridClass}>
              {participants.map((p) => (
                <div
                  key={p.sessionId}
                  className="dc-tile"
                  onClick={() => togglePin(p.sessionId)}
                  title="Büyütmek için tıkla"
                >
                  <ParticipantView participant={p} />
                  <div className="dc-tile__pin-hint">
                    <PinIcon className="size-3" /> Sabitle
                  </div>
                </div>
              ))}
            </div>
          )}
        </StreamTheme>
      </div>

      {/* ── control bar ── */}
      <div className="dc-bar">
        {/* mic */}
        <button
          className={`dc-btn ${isMicMuted ? "dc-btn--danger" : ""}`}
          onClick={() => microphone.toggle()}
          title={isMicMuted ? "Sesi Aç" : "Sesi Kapat"}
        >
          {isMicMuted ? <MicOffIcon className="dc-btn__icon" /> : <MicIcon className="dc-btn__icon" />}
          <span className="dc-btn__label">{isMicMuted ? "Sesi Aç" : "Sessiz"}</span>
        </button>

        {/* camera */}
        <button
          className={`dc-btn ${isCamMuted ? "dc-btn--danger" : ""}`}
          onClick={() => camera.toggle()}
          title={isCamMuted ? "Kamerayı Aç" : "Kamerayı Kapat"}
        >
          {isCamMuted ? <VideoOffIcon className="dc-btn__icon" /> : <VideoIcon className="dc-btn__icon" />}
          <span className="dc-btn__label">{isCamMuted ? "Kamera Aç" : "Kamerayı Kapat"}</span>
        </button>

        {/* screen share */}
        <button
          className={`dc-btn ${isScreenSharing ? "dc-btn--active" : ""}`}
          onClick={handleScreenShare}
          title={isScreenSharing ? "Paylaşımı Durdur" : "Ekranı Paylaş"}
        >
          {isScreenSharing
            ? <MonitorOffIcon className="dc-btn__icon" />
            : <MonitorIcon className="dc-btn__icon" />}
          <span className="dc-btn__label">{isScreenSharing ? "Paylaşımı Durdur" : "Ekran Paylaş"}</span>
        </button>

        <div className="dc-bar__divider" />

        {/* record */}
        <button
          className={`dc-btn ${isRecording ? "dc-btn--recording" : ""}`}
          onClick={handleRecord}
          disabled={recordLoading}
          title={isRecording ? "Kaydı Durdur" : "Kayıt Başlat"}
        >
          {recordLoading
            ? <LoaderIcon className="dc-btn__icon animate-spin" />
            : isRecording
              ? <SquareIcon className="dc-btn__icon" />
              : <CircleIcon className="dc-btn__icon" />}
          <span className="dc-btn__label">{isRecording ? "Kaydı Durdur" : "Kayıt"}</span>
        </button>

        {/* fullscreen */}
        <button
          className="dc-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran"}
        >
          {isFullscreen
            ? <Minimize2Icon className="dc-btn__icon" />
            : <Maximize2Icon className="dc-btn__icon" />}
          <span className="dc-btn__label">{isFullscreen ? "Küçült" : "Tam Ekran"}</span>
        </button>

        <div className="dc-bar__divider" />

        {/* leave */}
        <button
          className="dc-btn dc-btn--leave"
          onClick={() => call.leave()}
          title="Görüşmeden Ayrıl"
        >
          <PhoneOffIcon className="dc-btn__icon" />
          <span className="dc-btn__label">Ayrıl</span>
        </button>
      </div>
    </div>
  );
};

export default CallPage;
