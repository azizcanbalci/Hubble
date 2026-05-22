import { MessageCircleIcon, PlusIcon, BarChart2Icon } from "lucide-react";
import { useNavigate } from "react-router";
import { useFriends } from "../context/FriendsContext";

const ServerIcon = ({ server, isActive, onClick }) => {
  const label = server.icon || server.name.slice(0, 2).toUpperCase();

  return (
    <button
      className={`discord-server-icon discord-server-icon--server ${isActive ? "discord-server-icon--active" : ""}`}
      onClick={onClick}
      title={server.name}
    >
      <span className="discord-server-icon__label">{label}</span>
    </button>
  );
};

const ServerSidebar = ({ servers, selectedServerId, onSelectServer, onOpenCreateModal }) => {
  const { pendingRequests } = useFriends();
  const pendingCount = pendingRequests.incoming.length;
  const navigate = useNavigate();

  return (
    <div className="discord-server-sidebar">
      {/* App logo */}
      <div className="discord-server-icon">
        <img src="/logo.png" alt="Hubble" />
      </div>
      <div className="discord-server-separator" />

      {/* DM mode button */}
      <button
        className={`discord-server-icon discord-server-icon--dm ${selectedServerId === "dm" ? "discord-server-icon--active" : ""}`}
        onClick={() => onSelectServer("dm")}
        title="Direkt Mesajlar"
        style={{ position: "relative" }}
      >
        <MessageCircleIcon className="size-5" />
        {pendingCount > 0 && (
          <span className="friend-request-badge">{pendingCount}</span>
        )}
      </button>

      {/* Analyses button */}
      <button
        className="discord-server-icon discord-server-icon--dm"
        onClick={() => navigate("/analyses")}
        title="Toplantı Analizleri"
      >
        <BarChart2Icon className="size-5" />
      </button>

      {servers.length > 0 && <div className="discord-server-separator" />}

      {/* Server icons */}
      {servers.map((server) => (
        <ServerIcon
          key={server.serverId}
          server={server}
          isActive={selectedServerId === server.serverId}
          onClick={() => onSelectServer(server.serverId)}
        />
      ))}

      {servers.length > 0 && <div className="discord-server-separator" />}

      {/* Add server button */}
      <button
        className="discord-server-icon discord-server-icon--add"
        onClick={onOpenCreateModal}
        title="Sunucu Ekle"
      >
        <PlusIcon className="size-5" />
      </button>

      <div className="discord-server-sidebar__bottom">
      </div>
    </div>
  );
};

export default ServerSidebar;
