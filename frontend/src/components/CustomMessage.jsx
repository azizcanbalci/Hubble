import { MessageSimple, useMessageContext } from "stream-chat-react";
import { useAnalyze } from "../context/AnalyzeContext";
import { useFriends } from "../context/FriendsContext";

const CustomMessage = () => {
  const { message } = useMessageContext();
  const { analyzeMode, selectedIds, toggleMessage, sentimentMap } = useAnalyze();
  const { blockedUserIds } = useFriends();

  if (blockedUserIds.has(message.user?.id)) {
    return <div className="message-blocked">[Engellenmiş kullanıcının mesajı gizlendi]</div>;
  }

  const sentiment = sentimentMap[message.id];
  const isSelected = selectedIds.has(message.id);
  const canSelect = analyzeMode && !!message.text && message.type !== "system";

  return (
    <div className={`custom-message-row ${isSelected ? "custom-message-row--selected" : ""}`}>
      {analyzeMode && (
        <label className="message-select-label">
          <input
            type="checkbox"
            className="message-select-checkbox"
            checked={isSelected}
            disabled={!canSelect}
            onChange={() => canSelect && toggleMessage(message.id)}
          />
        </label>
      )}

      <div className="custom-message-row__body">
        <MessageSimple />
      </div>

      {sentiment && (
        <div
          className="sentiment-badge"
          title={`${sentiment.sentiment} · %${Math.round(sentiment.confidence * 100)} güven`}
        >
          <span className="sentiment-badge__emoji">{sentiment.emoji}</span>
          <span className="sentiment-badge__label">{sentiment.sentiment}</span>
          {sentiment.polarity && (
            <>
              <span className="sentiment-badge__sep">·</span>
              <span className="sentiment-badge__polarity">{sentiment.polarity}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomMessage;
