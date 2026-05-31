import { useState, useEffect } from "react";
import { StreamVideoClient } from "@stream-io/video-react-sdk";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";
import { useAppAuth } from "../context/AppAuthContext";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

export const useStreamVideo = () => {
  const { currentUser } = useAppAuth();
  const [videoClient, setVideoClient] = useState(null);

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!currentUser?.id,
  });

  useEffect(() => {
    if (!tokenData?.token || !currentUser?.id || !STREAM_API_KEY) return;

    let client = null;
    let cancelled = false;

    const init = async () => {
      client = new StreamVideoClient({
        apiKey: STREAM_API_KEY,
        user: {
          id: currentUser.id,
          name: currentUser.name,
          image: currentUser.image,
        },
        token: tokenData.token,
      });
      if (!cancelled) setVideoClient(client);
    };

    init();

    return () => {
      cancelled = true;
      if (client) client.disconnectUser().catch(() => {});
      setVideoClient(null);
    };
  }, [tokenData?.token, currentUser?.id]);

  return { videoClient };
};
