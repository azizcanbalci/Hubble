import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getAllAnalyses, getAnalysisStats, getAnalysisDetail } from "../lib/api";
import {
  ArrowLeftIcon,
  BarChart2Icon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AlertCircleIcon,
  SparklesIcon,
} from "lucide-react";
import "../styles/stream-chat-theme.css";

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", {
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

/* ── Emotion Bar Chart ─────────────────────────────────────────────── */
const EmotionBarChart = ({ breakdown }) => {
  if (!breakdown || !Object.keys(breakdown).length) return null;
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const colors = {
    positive: "#3ba55c", happy: "#3ba55c",
    negative: "#ed4245", angry: "#ed4245", sad: "#ed4245",
    neutral: "#72767d", calm: "#5865f2", surprised: "#faa61a",
  };

  return (
    <div className="emotion-bar-chart">
      {Object.entries(breakdown).sort((a, b) => b[1] - a[1]).map(([emotion, count]) => (
        <div key={emotion} className="emotion-bar-row">
          <span className="emotion-bar-row__label">{emotion}</span>
          <div className="emotion-bar-row__track">
            <div
              className="emotion-bar__fill"
              style={{ width: `${Math.round((count / total) * 100)}%`, background: colors[emotion] || "#5865f2" }}
            />
          </div>
          <span className="emotion-bar-row__count">{count}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Analysis Detail (expanded) ─────────────────────────────────────── */
const ExpandedDetail = ({ id, preloaded }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analysisDetail", id],
    queryFn: () => getAnalysisDetail(id),
    initialData: preloaded?.segments?.length ? preloaded : undefined,
    staleTime: Infinity,
  });

  if (isLoading) return (
    <div className="analyses-expand__loading">
      <RefreshCwIcon className="size-4 animate-spin" /> Yükleniyor...
    </div>
  );
  if (!data) return null;

  const { speaker_summaries = [], text_emotion, text_emoji, facial_emotion, facial_confidence, overall_emotion, overall_emoji, segments = [] } = data;

  return (
    <div className="analyses-expand">
      {/* Emotion cards */}
      <div className="analyses-emotion-row">
        <div className="analyses-emotion-card">
          <span className="analyses-emotion-card__emoji">{text_emoji || "💬"}</span>
          <span className="analyses-emotion-card__label">Metin Duygusu</span>
          <span className="analyses-emotion-card__value">{text_emotion || "—"}</span>
        </div>
        <div className="analyses-emotion-card">
          <span className="analyses-emotion-card__emoji">😐</span>
          <span className="analyses-emotion-card__label">Yüz Duygusu</span>
          <span className="analyses-emotion-card__value">
            {facial_emotion || "—"}
            {facial_confidence != null && (
              <small> (%{Math.round(facial_confidence * 100)})</small>
            )}
          </span>
        </div>
        <div className="analyses-emotion-card analyses-emotion-card--highlight">
          <span className="analyses-emotion-card__emoji">{overall_emoji || "✨"}</span>
          <span className="analyses-emotion-card__label">Genel Duygu</span>
          <span className="analyses-emotion-card__value">{overall_emotion || "—"}</span>
        </div>
      </div>

      {/* Speaker table */}
      {speaker_summaries.length > 0 && (
        <div className="analyses-expand__section">
          <p className="analyses-expand__section-title">Konuşmacı Özeti</p>
          <table className="analyses-speakers-table">
            <thead>
              <tr>
                <th>Konuşmacı</th>
                <th>Dominant Duygu</th>
                <th>Segment Sayısı</th>
                <th>Ort. Güven</th>
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
        <div className="analyses-expand__section">
          <p className="analyses-expand__section-title">Transkript</p>
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

/* ── Main Page ───────────────────────────────────────────────────────── */
const AnalysesPage = () => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);
  const [emotionFilter, setEmotionFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const params = {};
  if (emotionFilter) params.emotion = emotionFilter;
  if (fromDate) params.from = fromDate;
  if (toDate) params.to = toDate;

  const { data: listData, isLoading: listLoading, isError: listError, refetch } = useQuery({
    queryKey: ["allAnalyses", params],
    queryFn: () => getAllAnalyses(params),
    staleTime: 30_000,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["analysisStats"],
    queryFn: getAnalysisStats,
    staleTime: 60_000,
  });

  const analyses = listData?.analyses ?? [];
  const stats = statsData ?? {};

  const uniqueEmotions = [...new Set(analyses.map((a) => a.overall_emotion).filter(Boolean))];

  return (
    <div className="analyses-page">
      {/* Header */}
      <div className="analyses-header">
        <button className="analyses-back-btn" onClick={() => navigate("/")}>
          <ArrowLeftIcon className="size-4" />
          Geri
        </button>
        <div className="analyses-header__title">
          <BarChart2Icon className="size-5" />
          <h1>Toplantı Analizleri</h1>
        </div>
        <button className="analyses-back-btn" onClick={() => refetch()} title="Yenile">
          <RefreshCwIcon className="size-4" />
        </button>
      </div>

      <div className="analyses-content">
        {/* Stats Bar */}
        {!statsLoading && (
          <div className="analyses-stats-bar">
            <div className="analyses-stat-card">
              <span className="analyses-stat-card__value">{stats.totalMeetings ?? 0}</span>
              <span className="analyses-stat-card__label">Toplam Analiz</span>
            </div>
            <div className="analyses-stat-card">
              <span className="analyses-stat-card__value">{stats.totalSpeakers ?? 0}</span>
              <span className="analyses-stat-card__label">Toplam Konuşmacı</span>
            </div>
            <div className="analyses-stat-card">
              <span className="analyses-stat-card__value">
                {stats.mostCommonEmotion ?? "—"}
              </span>
              <span className="analyses-stat-card__label">En Sık Duygu</span>
            </div>
            <div className="analyses-stat-card">
              <span className="analyses-stat-card__value">
                {stats.avgFacialConfidence ? `%${Math.round(stats.avgFacialConfidence * 100)}` : "—"}
              </span>
              <span className="analyses-stat-card__label">Ort. Yüz Güveni</span>
            </div>
          </div>
        )}

        {/* Emotion Distribution + Monthly */}
        {stats.emotionBreakdown && Object.keys(stats.emotionBreakdown).length > 0 && (
          <div className="analyses-charts-row">
            <div className="analyses-chart-card">
              <p className="analyses-chart-card__title">Duygu Dağılımı</p>
              <EmotionBarChart breakdown={stats.emotionBreakdown} />
            </div>
            {stats.byMonth?.length > 0 && (
              <div className="analyses-chart-card">
                <p className="analyses-chart-card__title">Aylık Toplantı Sayısı</p>
                <div className="emotion-bar-chart">
                  {stats.byMonth.map(({ month, count }) => {
                    const max = Math.max(...stats.byMonth.map((m) => m.count));
                    return (
                      <div key={month} className="emotion-bar-row">
                        <span className="emotion-bar-row__label">{month}</span>
                        <div className="emotion-bar-row__track">
                          <div className="emotion-bar__fill" style={{ width: `${Math.round((count / max) * 100)}%` }} />
                        </div>
                        <span className="emotion-bar-row__count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter Bar */}
        <div className="analyses-filter-bar">
          <select
            className="analyses-filter-select"
            value={emotionFilter}
            onChange={(e) => setEmotionFilter(e.target.value)}
          >
            <option value="">Tüm Duygular</option>
            {uniqueEmotions.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <input
            type="date"
            className="analyses-filter-input"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            title="Başlangıç tarihi"
          />
          <span className="analyses-filter-sep">—</span>
          <input
            type="date"
            className="analyses-filter-input"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            title="Bitiş tarihi"
          />
          {(emotionFilter || fromDate || toDate) && (
            <button
              className="analyses-filter-clear"
              onClick={() => { setEmotionFilter(""); setFromDate(""); setToDate(""); }}
            >
              Temizle
            </button>
          )}
        </div>

        {/* List */}
        {listLoading && (
          <div className="analyses-state">
            <RefreshCwIcon className="size-5 animate-spin" />
            <span>Analizler yükleniyor...</span>
          </div>
        )}

        {listError && (
          <div className="analyses-state analyses-state--error">
            <AlertCircleIcon className="size-5" />
            <span>Analizler yüklenemedi.</span>
          </div>
        )}

        {!listLoading && !listError && analyses.length === 0 && (
          <div className="analyses-state analyses-state--empty">
            <SparklesIcon className="size-10" />
            <p className="font-medium">Henüz analiz yok</p>
            <p className="text-sm mt-1">Kayıt panelinden "Analiz Et" butonuna basarak başlayın.</p>
          </div>
        )}

        {analyses.length > 0 && (
          <div className="analyses-list">
            {analyses.map((a) => {
              const isExpanded = expandedId === a._id;
              return (
                <div key={a._id} className={`analyses-item ${isExpanded ? "analyses-item--expanded" : ""}`}>
                  <button
                    className="analyses-item__row"
                    onClick={() => setExpandedId(isExpanded ? null : a._id)}
                  >
                    <span className="analyses-item__emoji">{a.overall_emoji || "📊"}</span>
                    <div className="analyses-item__info">
                      <span className="analyses-item__date">{formatDate(a.meetingDate || a.createdAt)}</span>
                      <span className="analyses-item__channel">{a.callId}</span>
                    </div>
                    <div className="analyses-item__meta">
                      <span>{a.total_speakers ?? 0} konuşmacı</span>
                      <span>·</span>
                      <span>{a.total_segments ?? 0} segment</span>
                      <span>·</span>
                      <span className="analyses-item__emotion">{a.overall_emotion || "—"}</span>
                    </div>
                    {isExpanded ? <ChevronUpIcon className="size-4 analyses-item__chevron" /> : <ChevronDownIcon className="size-4 analyses-item__chevron" />}
                  </button>

                  {isExpanded && <ExpandedDetail id={a._id} preloaded={a} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysesPage;
