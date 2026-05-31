import { MessageCircleIcon, PlusIcon, BarChart2Icon } from "lucide-react";
import { useNavigate } from "react-router";
import { useFriends } from "../context/FriendsContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ServerIcon = ({ server, isActive, onClick }) => {
  const label = server.icon || server.name.slice(0, 2).toUpperCase();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={`discord-server-icon discord-server-icon--server ${isActive ? "discord-server-icon--active" : ""}`}
          onClick={onClick}
        >
          <span className="discord-server-icon__label">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{server.name}</TooltipContent>
    </Tooltip>
  );
};

const ServerSidebar = ({ servers, selectedServerId, onSelectServer, onOpenCreateModal }) => {
  const { pendingRequests } = useFriends();
  const pendingCount = pendingRequests.incoming.length;
  const navigate = useNavigate();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="discord-server-sidebar">
        {/* App logo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="discord-server-icon">
              <img src="/logo.png" alt="Hubble" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">Hubble</TooltipContent>
        </Tooltip>

        <div className="discord-server-separator" />

        {/* DM mode button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`discord-server-icon discord-server-icon--dm ${selectedServerId === "dm" ? "discord-server-icon--active" : ""}`}
              onClick={() => onSelectServer("dm")}
              style={{ position: "relative" }}
            >
              <MessageCircleIcon className="size-5" />
              {pendingCount > 0 && (
                <span className="friend-request-badge">{pendingCount}</span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Direkt Mesajlar</TooltipContent>
        </Tooltip>

        {/* Analyses button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="discord-server-icon discord-server-icon--dm"
              onClick={() => navigate("/analyses")}
            >
              <BarChart2Icon className="size-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Toplantı Analizleri</TooltipContent>
        </Tooltip>

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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="discord-server-icon discord-server-icon--add"
              onClick={onOpenCreateModal}
            >
              <PlusIcon className="size-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Sunucu Ekle</TooltipContent>
        </Tooltip>

        <div className="discord-server-sidebar__bottom" />
      </div>
    </TooltipProvider>
  );
};

export default ServerSidebar;
