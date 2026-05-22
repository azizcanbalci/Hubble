import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getInviteInfo, joinServerByInvite } from "../lib/api";
import { Users2Icon, LoaderIcon } from "lucide-react";
import toast from "react-hot-toast";

const InvitePage = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["inviteInfo", code],
    queryFn: () => getInviteInfo(code),
    retry: false,
  });

  const joinMutation = useMutation({
    mutationFn: () => joinServerByInvite(code),
    onSuccess: ({ server }) => {
      toast.success(`"${server.name}" sunucusuna katıldın!`);
      navigate(`/?server=${server.serverId}`);
    },
    onError: () => toast.error("Sunucuya katılınamadı"),
  });

  if (isLoading) {
    return (
      <div className="invite-page">
        <div className="invite-card">
          <LoaderIcon className="size-8 animate-spin text-indigo-400" />
          <p className="invite-loading">Davet bilgisi yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="invite-page">
        <div className="invite-card">
          <h2 className="invite-error-title">Geçersiz Davet</h2>
          <p className="invite-error-desc">
            Bu davet linki geçersiz ya da süresi dolmuş olabilir.
          </p>
          <button className="btn btn-secondary" onClick={() => navigate("/")}>
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  const { name, icon, memberCount } = data;

  return (
    <div className="invite-page">
      <div className="invite-card">
        <div className="invite-server-icon">
          {icon ? (
            <span className="invite-server-icon__emoji">{icon}</span>
          ) : (
            <span className="invite-server-icon__initials">
              {name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <p className="invite-subtitle">Davet alındı</p>
        <h1 className="invite-server-name">{name}</h1>

        <div className="invite-meta">
          <Users2Icon className="size-4" />
          <span>{memberCount} üye</span>
        </div>

        <button
          className="btn btn-primary invite-join-btn"
          onClick={() => joinMutation.mutate()}
          disabled={joinMutation.isPending}
        >
          {joinMutation.isPending ? "Katılınıyor..." : "Sunucuya Katıl"}
        </button>

        <button className="invite-cancel" onClick={() => navigate("/")}>
          İptal
        </button>
      </div>
    </div>
  );
};

export default InvitePage;
