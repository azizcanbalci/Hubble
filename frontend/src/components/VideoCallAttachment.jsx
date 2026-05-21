import { VideoIcon } from "lucide-react";
import { useNavigate } from "react-router";

const VideoCallAttachment = ({ callUrl }) => {
  const navigate = useNavigate();

  const handleJoin = () => {
    try {
      const url = new URL(callUrl);
      navigate(url.pathname);
    } catch {
      navigate(callUrl);
    }
  };

  return (
    <div className="video-call-card">
      <div className="video-call-card__icon-wrap">
        <VideoIcon className="size-5" />
      </div>
      <div className="video-call-card__body">
        <p className="video-call-card__title">Video Call</p>
        <p className="video-call-card__subtitle">A video call has been started</p>
      </div>
      <button className="video-call-card__join-btn" onClick={handleJoin}>
        Join Call
      </button>
    </div>
  );
};

export default VideoCallAttachment;
