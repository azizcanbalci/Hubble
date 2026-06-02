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
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!tokenData?.token || !user || !callId) return;

    let videoClient = null;
    let callInstance = null;
    let isMounted = true;

    const initCall = async () => {
      try {
        videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user: { id: user.id, name: user.name, image: user.image },
          token: tokenData.token,
        });
        callInstance = videoClient.call("default", callId);
        await callInstance.join({ create: true });
        if (!isMounted) {
          await callInstance.leave().catch(() => {});
          await videoClient.disconnectUser().catch(() => {});
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
      callInstance?.leave().catch(() => {});
      videoClient?.disconnectUser().catch(() => {});
    };
  }, [tokenData?.token, user?.id, callId]);

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

/* ─── Control button helper ──────────────────────────────────── */
const CtrlBtn = ({ label, tooltip, onClick, variant = "secondary", disabled, children, className }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant={variant}
        onClick={onClick}
        disabled={disabled}
        className={`flex-col gap-1 h-16 min-w-[66px] rounded-xl ${className || ""}`}
      >
        {children}
        <span className="text-[10px] font-medium leading-none">{label}</span>
      </Button>
    </TooltipTrigger>
    <TooltipContent>{tooltip}</TooltipContent>
  </Tooltip>
);

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

  useEffect(() => {
    if (callingState === CallingState.LEFT) navigate("/");
  }, [callingState, navigate]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const pinned = pinnedId ? participants.find((p) => p.sessionId === pinnedId) : null;
  const others = pinnedId ? participants.filter((p) => p.sessionId !== pinnedId) : [];
  const togglePin = (sessionId) => setPinnedId((prev) => (prev === sessionId ? null : sessionId));

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

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

  const handleScreenShare = async () => {
    try {
      await screenShare.toggle();
    } catch {
      toast.error("Ekran paylaşımı başlatılamadı");
    }
  };

  const gridClass = pinnedId
    ? "dc-grid dc-grid--pinned"
    : `dc-grid dc-grid--${Math.min(participants.length, 9)}`;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="dc-call" ref={containerRef}>
        {/* ── video area ── */}
        <div className="dc-video-area">
          <StreamTheme>
            {pinnedId ? (
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
              <div className={gridClass}>
                {participants.map((p) => (
                  <div
                    key={p.sessionId}
                    className="dc-tile"
                    onClick={() => togglePin(p.sessionId)}
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
          <CtrlBtn
            label={isMicMuted ? "Sesi Aç" : "Sessiz"}
            tooltip={isMicMuted ? "Sesi Aç" : "Sesi Kapat"}
            onClick={() => microphone.toggle()}
            variant={isMicMuted ? "destructive" : "secondary"}
          >
            {isMicMuted ? <MicOffIcon className="size-5" /> : <MicIcon className="size-5" />}
          </CtrlBtn>

          <CtrlBtn
            label={isCamMuted ? "Kamera Aç" : "Kamerayı Kapat"}
            tooltip={isCamMuted ? "Kamerayı Aç" : "Kamerayı Kapat"}
            onClick={() => camera.toggle()}
            variant={isCamMuted ? "destructive" : "secondary"}
          >
            {isCamMuted ? <VideoOffIcon className="size-5" /> : <VideoIcon className="size-5" />}
          </CtrlBtn>

          <CtrlBtn
            label={isScreenSharing ? "Paylaşımı Durdur" : "Ekran Paylaş"}
            tooltip={isScreenSharing ? "Paylaşımı Durdur" : "Ekranı Paylaş"}
            onClick={handleScreenShare}
            variant={isScreenSharing ? "default" : "secondary"}
            className={isScreenSharing ? "bg-green-600 hover:bg-green-700 text-white" : ""}
          >
            {isScreenSharing ? <MonitorOffIcon className="size-5" /> : <MonitorIcon className="size-5" />}
          </CtrlBtn>

          <div className="dc-bar__divider" />

          <CtrlBtn
            label={isRecording ? "Kaydı Durdur" : "Kayıt"}
            tooltip={isRecording ? "Kaydı Durdur" : "Kayıt Başlat"}
            onClick={handleRecord}
            disabled={recordLoading}
            variant={isRecording ? "destructive" : "secondary"}
            className={isRecording ? "animate-pulse" : ""}
          >
            {recordLoading
              ? <LoaderIcon className="size-5 animate-spin" />
              : isRecording
                ? <SquareIcon className="size-5" />
                : <CircleIcon className="size-5" />}
          </CtrlBtn>

          <CtrlBtn
            label={isFullscreen ? "Küçült" : "Tam Ekran"}
            tooltip={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran"}
            onClick={toggleFullscreen}
            variant="secondary"
          >
            {isFullscreen ? <Minimize2Icon className="size-5" /> : <Maximize2Icon className="size-5" />}
          </CtrlBtn>

          <div className="dc-bar__divider" />

          <CtrlBtn
            label="Ayrıl"
            tooltip="Görüşmeden Ayrıl"
            onClick={() => call.leave()}
            variant="destructive"
          >
            <PhoneOffIcon className="size-5" />
          </CtrlBtn>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CallPage;
