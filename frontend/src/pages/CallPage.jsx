import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";

import { getStreamToken } from "../lib/api";

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  SpeakerLayout,
  StreamTheme,
  CallingState,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { VideoIcon } from "lucide-react";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import "../styles/call-page.css";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const CallPage = () => {
  const { id: callId } = useParams();
  const { user, isLoaded } = useUser();

  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!user,
  });

  useEffect(() => {
    const initCall = async () => {
      if (!tokenData.token || !user || !callId) return;

      try {
        const videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user: {
            id: user.id,
            name: user.fullName,
            image: user.imageUrl,
          },
          token: tokenData.token,
        });

        const callInstance = videoClient.call("default", callId);
        await callInstance.join({ create: true });

        setClient(videoClient);
        setCall(callInstance);
      } catch (error) {
        console.log("Error init call:", error);
        toast.error("Cannot connect to the call.");
      } finally {
        setIsConnecting(false);
      }
    };

    initCall();
  }, [tokenData, user, callId]);

  if (isConnecting || !isLoaded) {
    return (
      <div className="call-page-shell relative flex h-screen items-center justify-center overflow-hidden bg-[#F3F5F9]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(42,157,143,0.25),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(38,70,83,0.22),transparent_42%),radial-gradient(circle_at_70%_80%,rgba(233,196,106,0.22),transparent_48%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(38,70,83,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(38,70,83,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative z-10 flex flex-col items-center gap-3 text-[#1F2937]">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-md ring-1 ring-[#264653]/20">
            <VideoIcon className="size-7 animate-pulse text-[#1264A3]" />
          </span>
          <p className="text-base font-medium">Connecting to call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="call-page-shell relative flex h-screen flex-col items-center justify-center overflow-hidden bg-[#F3F5F9] px-4 py-6">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#2A9D8F]/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full bg-[#264653]/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] left-1/2 h-80 w-[38rem] -translate-x-1/2 rounded-full bg-[#E9C46A]/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(to_right,rgba(38,70,83,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(38,70,83,0.14)_1px,transparent_1px)] [background-size:52px_52px]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        {client && call ? (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <CallContent />
            </StreamCall>
          </StreamVideo>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p>Could not initialize call. Please refresh or try again later</p>
          </div>
        )}
      </div>
    </div>
  );
};

const CallContent = () => {
  const { useCallCallingState } = useCallStateHooks();

  const callingState = useCallCallingState();
  const navigate = useNavigate();

  if (callingState === CallingState.LEFT) return navigate("/");

  return (
    <StreamTheme>
      <SpeakerLayout />
      <CallControls />
    </StreamTheme>
  );
};

export default CallPage;
