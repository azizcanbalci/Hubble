import { createContext, useContext, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSentimentsForChannel, analyzeMessages } from "../lib/api";
import toast from "react-hot-toast";

const AnalyzeContext = createContext(null);

export const AnalyzeProvider = ({ children, channelId, sentimentAnalysisEnabled }) => {
  const [analyzeMode, setAnalyzeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const { data: sentimentData } = useQuery({
    queryKey: ["sentiments"],
    queryFn: () => getSentimentsForChannel(channelId),
    enabled: !!channelId && sentimentAnalysisEnabled !== false,
    staleTime: 5 * 60 * 1000,
  });

  const sentimentMap = useMemo(() => {
    if (!sentimentAnalysisEnabled) return {};
    const map = {};
    (sentimentData?.sentiments || []).forEach((s) => {
      map[s.streamMessageId] = s;
    });
    return map;
  }, [sentimentData, sentimentAnalysisEnabled]);

  const toggleMessage = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const enterAnalyzeMode = () => {
    setAnalyzeMode(true);
    setSelectedIds(new Set());
  };

  const exitAnalyzeMode = () => {
    setAnalyzeMode(false);
    setSelectedIds(new Set());
  };

  const runAnalysis = async (messages, activeChannelId) => {
    if (!messages.length) {
      exitAnalyzeMode();
      return;
    }
    setIsAnalyzing(true);
    try {
      const { results } = await analyzeMessages(messages, activeChannelId || channelId);

      queryClient.setQueryData(["sentiments"], (old) => {
        const map = {};
        (old?.sentiments || []).forEach((s) => {
          map[s.streamMessageId] = s;
        });
        results.forEach((r) => {
          map[r.id] = {
            streamMessageId: r.id,
            sentiment: r.sentiment,
            emoji: r.emoji,
            confidence: r.confidence,
          };
        });
        return { sentiments: Object.values(map) };
      });

      toast.success(`${results.length} mesaj analiz edildi`);
    } catch {
      toast.error("Analiz başarısız oldu");
    } finally {
      setIsAnalyzing(false);
      exitAnalyzeMode();
    }
  };

  return (
    <AnalyzeContext.Provider
      value={{
        analyzeMode,
        selectedIds,
        sentimentMap,
        isAnalyzing,
        toggleMessage,
        enterAnalyzeMode,
        exitAnalyzeMode,
        runAnalysis,
        sentimentAnalysisEnabled,
      }}
    >
      {children}
    </AnalyzeContext.Provider>
  );
};

export const useAnalyze = () => {
  const ctx = useContext(AnalyzeContext);
  if (!ctx) throw new Error("useAnalyze must be used within AnalyzeProvider");
  return ctx;
};
