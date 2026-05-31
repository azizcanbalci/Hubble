import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { searchChannelMessages } from "../lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const getRecentSearchesKey = (channelId) => `hubble:recent-searches:${channelId}`;

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const highlightText = (text, query) => {
  if (!text) return "";
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return text;
  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "ig");
  return text.split(regex).map((part, index) =>
    part.toLowerCase() === trimmedQuery.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="bg-[#7c3aed]/30 text-[#c4b5fd] px-0.5 rounded-sm">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
};

function ChannelSearchModal({ channelId, channelName, onClose, onSelectMessage }) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);

  const canSearch = query.trim().length >= 2;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(getRecentSearchesKey(channelId));
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((item) => typeof item === "string").slice(0, 6));
      }
    } catch {
      // ignore
    }
  }, [channelId]);

  const saveRecentSearch = (value) => {
    const cleaned = (value || "").trim();
    if (cleaned.length < 2) return;
    const updated = [
      cleaned,
      ...recentSearches.filter((item) => item.toLowerCase() !== cleaned.toLowerCase()),
    ].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem(getRecentSearchesKey(channelId), JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      setError("");
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await searchChannelMessages(channelId, query.trim());
        setResults(response.messages || []);
      } catch {
        setError("Arama sırasında bir sorun oluştu.");
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [canSearch, channelId, query]);

  const title = useMemo(() => {
    if (!channelName) return "Kanal İçi Arama";
    return `${channelName} içinde ara`;
  }, [channelName]);

  const handleResultClick = (messageId) => {
    saveRecentSearch(query);
    onSelectMessage(messageId);
    onClose();
  };

  const handleOpenFirstResult = () => {
    if (!results.length) return;
    handleResultClick(results[0].streamMessageId);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#949ba4]" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results.length > 0) {
                e.preventDefault();
                handleOpenFirstResult();
              }
            }}
            placeholder="Mesajlarda ara..."
            className="pl-9"
            autoFocus
          />
        </div>
        <p className="text-xs text-[#949ba4]">
          En az 2 karakter girerek bu kanalda arama yapabilirsiniz.
        </p>

        <div className="max-h-[380px] overflow-y-auto space-y-1">
          {!canSearch && (
            <div className="py-4">
              <p className="text-center text-sm text-[#949ba4] mb-3">Aramak için yazmaya başlayın.</p>
              {recentSearches.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
                    Son Aramalar
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((item) => (
                      <Badge
                        key={item}
                        variant="outline"
                        className="cursor-pointer hover:bg-white/10 hover:text-white transition-colors"
                        onClick={() => setQuery(item)}
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {canSearch && isLoading && (
            <p className="py-6 text-center text-sm text-[#949ba4]">Aranıyor...</p>
          )}

          {canSearch && !isLoading && error && (
            <p className="py-6 text-center text-sm text-[#f23f43]">{error}</p>
          )}

          {canSearch && !isLoading && !error && results.length === 0 && (
            <p className="py-6 text-center text-sm text-[#949ba4]">Sonuç bulunamadı.</p>
          )}

          {canSearch && !isLoading && !error && results.length > 0 && (
            <div className="space-y-1 py-1">
              {results.map((message) => (
                <Button
                  key={message._id}
                  variant="ghost"
                  className="w-full h-auto py-3 px-4 justify-start flex-col items-start gap-1 border border-white/5 hover:border-[#7c3aed]/40 hover:bg-[#7c3aed]/10"
                  onClick={() => handleResultClick(message.streamMessageId)}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-[#f2f3f5]">
                      {message.userName || message.userId}
                    </span>
                    <span className="shrink-0 text-xs text-[#949ba4]">
                      {formatDateTime(message.createdAt)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-[#b5bac1] text-left">
                    {highlightText(message.text, query)}
                  </p>
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ChannelSearchModal;
