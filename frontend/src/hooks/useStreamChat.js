import { useState, useEffect } from "react";
import { StreamChat } from "stream-chat";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";
import { useAppAuth } from "../context/AppAuthContext";
import * as Sentry from "@sentry/react";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

export const useStreamChat = () => {
  const { currentUser } = useAppAuth();
  const [chatClient, setChatClient] = useState(null);

  const {
    data: tokenData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!currentUser?.id,
  });

  useEffect(() => {
    if (!tokenData?.token || !currentUser?.id || !STREAM_API_KEY) return;

    const client = StreamChat.getInstance(STREAM_API_KEY);
    let cancelled = false;

    const connect = async () => {
      try {
        if (client.userID === currentUser.id) {
          if (!cancelled) setChatClient(client);
          return;
        }

        if (client.userID) {
          await client.disconnectUser();
        }

        await client.connectUser(
          {
            id: currentUser.id,
            name: currentUser.name || currentUser.id,
            image: currentUser.image || undefined,
          },
          tokenData.token
        );
        if (!cancelled) {
          setChatClient(client);
        }
      } catch (error) {
        console.log("Error connecting to stream", error);
        Sentry.captureException(error, {
          tags: { component: "useStreamChat" },
          extra: {
            context: "stream_chat_connection",
            userId: currentUser?.id,
            streamApiKey: STREAM_API_KEY ? "present" : "missing",
          },
        });
      }
    };

    connect();

    return () => {
      cancelled = true;
    };
  }, [tokenData?.token, currentUser?.id]);

  return { chatClient, isLoading, error };
};
