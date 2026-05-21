import { XIcon, FilmIcon, ExternalLinkIcon, ClockIcon, RefreshCwIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCallRecordings } from "../lib/api";

const formatDuration = (seconds) => {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const formatDate = (isoString) => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function RecordingsPanel({ channelId, onClose }) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["recordings", channelId],
    queryFn: () => getCallRecordings(channelId),
    refetchInterval: (query) =>
      query.state.data?.recordings?.length === 0 ? 15_000 : false,
    staleTime: 0,
  });

  const recordings = data?.recordings ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-2xl font-semibold">Görüşme Kayıtları</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
              title="Yenile"
            >
              <RefreshCwIcon className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <RefreshCwIcon className="w-5 h-5 animate-spin mr-2" />
              <span>Kayıtlar yükleniyor...</span>
            </div>
          )}

          {isError && (
            <p className="text-center text-red-500 py-8">
              Kayıtlar yüklenemedi.
            </p>
          )}

          {!isLoading && !isError && recordings.length === 0 && (
            <div className="text-center text-gray-500 py-10">
              <FilmIcon className="mx-auto mb-3 size-10 text-gray-300" />
              <p className="font-medium">Henüz kayıt yok</p>
              <p className="text-xs mt-1 text-gray-400">
                Kayıtlar görüşme bittikten ~30 saniye sonra burada görünür.
              </p>
            </div>
          )}

          {recordings.map((rec, index) => (
            <div
              key={rec.url}
              className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  Kayıt {index + 1}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <ClockIcon className="size-3 shrink-0" />
                  <span>{formatDate(rec.start_time)}</span>
                  <span>·</span>
                  <span>{formatDuration(rec.duration)}</span>
                </div>
              </div>
              <a
                href={rec.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <ExternalLinkIcon className="size-3" />
                İzle
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RecordingsPanel;
