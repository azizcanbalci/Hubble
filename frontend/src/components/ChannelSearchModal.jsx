import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { searchChannelMessages } from "../lib/api";

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
      <mark key={`${part}-${index}`} className="bg-[#FFE8A3] px-0.5 rounded-sm">
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
    } catch (storageError) {
      console.error("Unable to load recent searches", storageError);
    }
  }, [channelId]);

  const saveRecentSearch = (value) => {
    const cleaned = (value || "").trim();
    if (cleaned.length < 2) return;

    const updated = [cleaned, ...recentSearches.filter((item) => item.toLowerCase() !== cleaned.toLowerCase())].slice(
      0,
      6,
    );

    setRecentSearches(updated);

    try {
      localStorage.setItem(getRecentSearchesKey(channelId), JSON.stringify(updated));
    } catch (storageError) {
      console.error("Unable to save recent searches", storageError);
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
      } catch (searchError) {
        console.error("Channel search failed", searchError);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-[#1D1C1D]">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-[#1264A3]">
            <SearchIcon className="size-4 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results.length > 0) {
                  event.preventDefault();
                  handleOpenFirstResult();
                }
              }}
              placeholder="Mesajlarda ara..."
              className="w-full border-none bg-transparent text-sm text-[#1D1C1D] outline-none"
              autoFocus
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">En az 2 karakter girerek bu kanalda arama yapabilirsiniz.</p>
        </div>

        <div className="max-h-[420px] overflow-y-auto px-6 py-3">
          {!canSearch && (
            <div className="py-4">
              <div className="mb-4 text-center text-sm text-gray-500">Aramak için yazmaya başlayın.</div>

              {recentSearches.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Son Aramalar</p>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setQuery(item)}
                        className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700 hover:border-[#1264A3] hover:text-[#1264A3]"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {canSearch && isLoading && <div className="py-6 text-center text-sm text-gray-500">Aranıyor...</div>}

          {canSearch && !isLoading && error && <div className="py-6 text-center text-sm text-red-500">{error}</div>}

          {canSearch && !isLoading && !error && results.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-500">Sonuç bulunamadı.</div>
          )}

          {canSearch && !isLoading && !error && results.length > 0 && (
            <div className="space-y-2 py-2">
              {results.map((message) => (
                <button
                  key={message._id}
                  onClick={() => handleResultClick(message.streamMessageId)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left transition hover:border-[#1264A3] hover:bg-[#F8FBFF]"
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-[#1D1C1D]">{message.userName || message.userId}</span>
                    <span className="shrink-0 text-xs text-gray-500">{formatDateTime(message.createdAt)}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-gray-700">{highlightText(message.text, query)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChannelSearchModal;
