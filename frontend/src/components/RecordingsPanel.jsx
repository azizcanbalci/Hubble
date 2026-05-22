import { useState, useEffect } from "react";
import {
  XIcon,
  FilmIcon,
  ExternalLinkIcon,
  ClockIcon,
  RefreshCwIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCallRecordings, getCallAnalyses, analyzeRecording } from "../lib/api";

const formatDuration = (seconds) => {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const formatDate = (isoString) => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const formatSeconds = (sec) => {
  if (sec == null) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const AnalysisDetail = ({ data }) => {
  if (!data) return null;

  const { speaker_summaries = [], text_emotion, text_emoji, facial_emotion, facial_confidence, overall_emotion, overall_emoji, segments = [] } = data;

  return (
    <div className="rec-analysis__fields">
      {/* Emotion overview */}
      <div className="rec-analysis__field">
        <span className="rec-analysis__field-label">Duygusal Genel Bakış</span>
        <div className="analyses-emotion-row">
          <div className="analyses-emotion-card">
            <span className="analyses-emotion-card__emoji">{text_emoji || "💬"}</span>
            <span className="analyses-emotion-card__label">Metin</span>
            <span className="analyses-emotion-card__value">{text_emotion || "—"}</span>
          </div>
          <div className="analyses-emotion-card">
            <span className="analyses-emotion-card__emoji">{facial_confidence ? "😐" : "—"}</span>
            <span className="analyses-emotion-card__label">Yüz</span>
            <span className="analyses-emotion-card__value">{facial_emotion || "—"}</span>
          </div>
          <div className="analyses-emotion-card analyses-emotion-card--highlight">
            <span className="analyses-emotion-card__emoji">{overall_emoji || "✨"}</span>
            <span className="analyses-emotion-card__label">Genel</span>
            <span className="analyses-emotion-card__value">{overall_emotion || "—"}</span>
          </div>
        </div>
      </div>

      {/* Speaker summaries */}
      {speaker_summaries.length > 0 && (
        <div className="rec-analysis__field">
          <span className="rec-analysis__field-label">Konuşmacılar</span>
          <table className="analyses-speakers-table">
            <thead>
              <tr>
                <th>Konuşmacı</th>
                <th>Dominant Duygu</th>
                <th>Segment</th>
                <th>Güven</th>
              </tr>
            </thead>
            <tbody>
              {speaker_summaries.map((s) => (
                <tr key={s.speaker_id}>
                  <td>{s.speaker_id}</td>
                  <td>{s.dominant_emoji} {s.dominant_emotion}</td>
                  <td>{s.segment_count}</td>
                  <td>{s.avg_confidence != null ? `%${Math.round(s.avg_confidence * 100)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transcript */}
      {segments.length > 0 && (
        <div className="rec-analysis__field">
          <span className="rec-analysis__field-label">Transkript</span>
          <div className="analyses-transcript">
            {segments.map((seg, i) => (
              <div key={i} className="analyses-segment">
                <span className="analyses-segment__time">{formatSeconds(seg.start_sec)}</span>
                <span className="analyses-segment__speaker">{seg.speaker_id}</span>
                <span className="analyses-segment__text">{seg.text}</span>
                <span className="analyses-segment__badge">{seg.emoji} {seg.sentiment}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function RecordingsPanel({ channelId, onClose }) {
  const queryClient = useQueryClient();
  const [analysisMap, setAnalysisMap] = useState({});
  const [expandedUrl, setExpandedUrl] = useState(null);
  const [loadingUrls, setLoadingUrls] = useState(new Set());

  const { data: recData, isLoading: recLoading, isError: recError, refetch, isFetching } = useQuery({
    queryKey: ["recordings", channelId],
    queryFn: () => getCallRecordings(channelId),
    refetchInterval: (query) => query.state.data?.recordings?.length === 0 ? 15_000 : false,
    staleTime: 0,
  });

  const { data: analysesData } = useQuery({
    queryKey: ["callAnalyses", channelId],
    queryFn: () => getCallAnalyses(channelId),
    staleTime: 30_000,
  });

  // Seed analysisMap from DB results
  useEffect(() => {
    if (!analysesData?.analyses) return;
    setAnalysisMap((prev) => {
      const next = { ...prev };
      for (const a of analysesData.analyses) {
        if (!next[a.recordingUrl]) {
          next[a.recordingUrl] = { status: "done", data: a };
        }
      }
      return next;
    });
  }, [analysesData]);

  const recordings = recData?.recordings ?? [];

  const handleAnalyze = async (url, startTime) => {
    setLoadingUrls((prev) => new Set([...prev, url]));
    setAnalysisMap((prev) => ({ ...prev, [url]: { status: "loading" } }));
    setExpandedUrl(url);
    try {
      const result = await analyzeRecording(channelId, url, startTime);
      setAnalysisMap((prev) => ({ ...prev, [url]: { status: "done", data: result } }));
      queryClient.invalidateQueries({ queryKey: ["callAnalyses", channelId] });
    } catch (err) {
      const msg = err?.response?.data?.message || "Analiz başlatılamadı";
      setAnalysisMap((prev) => ({ ...prev, [url]: { status: "error", message: msg } }));
    } finally {
      setLoadingUrls((prev) => { const s = new Set(prev); s.delete(url); return s; });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rec-panel">
        <div className="rec-panel__header">
          <div className="rec-panel__title">
            <FilmIcon className="size-5" />
            <h2>Görüşme Kayıtları</h2>
          </div>
          <div className="rec-panel__header-actions">
            <button onClick={() => refetch()} disabled={isFetching} className="rec-panel__icon-btn" title="Yenile">
              <RefreshCwIcon className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <button onClick={onClose} className="rec-panel__icon-btn">
              <XIcon className="size-4" />
            </button>
          </div>
        </div>

        <div className="rec-panel__body">
          {recLoading && (
            <div className="rec-panel__state">
              <RefreshCwIcon className="size-5 animate-spin" />
              <span>Kayıtlar yükleniyor...</span>
            </div>
          )}

          {recError && (
            <div className="rec-panel__state rec-panel__state--error">
              <AlertCircleIcon className="size-5" />
              <span>Kayıtlar yüklenemedi.</span>
            </div>
          )}

          {!recLoading && !recError && recordings.length === 0 && (
            <div className="rec-panel__state rec-panel__state--empty">
              <FilmIcon className="size-10" />
              <p className="font-medium">Henüz kayıt yok</p>
              <p className="text-xs mt-1">Kayıtlar görüşme bittikten ~30 saniye sonra burada görünür.</p>
            </div>
          )}

          {recordings.map((rec, index) => {
            const analysis = analysisMap[rec.url];
            const isExpanded = expandedUrl === rec.url;
            const isLoading = loadingUrls.has(rec.url);

            return (
              <div key={rec.url} className="rec-item">
                <div className="rec-item__row">
                  <div className="rec-item__info">
                    <p className="rec-item__title">Kayıt {index + 1}</p>
                    <div className="rec-item__meta">
                      <ClockIcon className="size-3 shrink-0" />
                      <span>{formatDate(rec.start_time)}</span>
                      <span>·</span>
                      <span>{formatDuration(rec.duration)}</span>
                    </div>
                  </div>

                  <div className="rec-item__actions">
                    <button
                      className={`rec-btn rec-btn--analyze ${isLoading ? "rec-btn--loading" : ""} ${analysis?.status === "error" ? "rec-btn--error" : ""}`}
                      onClick={() => {
                        if (analysis?.status === "done" || analysis?.status === "error") {
                          setExpandedUrl(isExpanded ? null : rec.url);
                        } else if (!isLoading) {
                          handleAnalyze(rec.url, rec.start_time);
                        }
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <RefreshCwIcon className="size-3 animate-spin" />
                      ) : analysis?.status === "done" ? (
                        <CheckCircleIcon className="size-3" />
                      ) : analysis?.status === "error" ? (
                        <AlertCircleIcon className="size-3" />
                      ) : (
                        <SparklesIcon className="size-3" />
                      )}
                      {isLoading ? "Analiz ediliyor..."
                        : analysis?.status === "done" ? (isExpanded ? "Gizle" : "Sonucu Gör")
                        : analysis?.status === "error" ? "Hata"
                        : "Analiz Et"}
                      {(analysis?.status === "done" || analysis?.status === "error") && (
                        isExpanded ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />
                      )}
                    </button>

                    <a href={rec.url} target="_blank" rel="noopener noreferrer" className="rec-btn rec-btn--watch">
                      <ExternalLinkIcon className="size-3" />
                      İzle
                    </a>
                  </div>
                </div>

                {isExpanded && analysis && (
                  <div className={`rec-analysis ${analysis.status === "error" ? "rec-analysis--error" : ""}`}>
                    {analysis.status === "error" ? (
                      <div className="rec-analysis__error">
                        <AlertCircleIcon className="size-4" />
                        <span>{analysis.message}</span>
                      </div>
                    ) : (
                      <>
                        <div className="rec-analysis__header">
                          <SparklesIcon className="size-3.5" />
                          <span>Analiz Sonucu</span>
                          {analysis.data?.overall_emoji && (
                            <span style={{ marginLeft: "auto", fontSize: "18px" }}>{analysis.data.overall_emoji}</span>
                          )}
                        </div>
                        <AnalysisDetail data={analysis.data} />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RecordingsPanel;
