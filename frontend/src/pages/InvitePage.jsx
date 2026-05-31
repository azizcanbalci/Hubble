import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getInviteInfo, joinServerByInvite } from "../lib/api";
import { Users2Icon, LoaderIcon } from "lucide-react";
import toast from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-3 p-10">
            <LoaderIcon className="size-8 animate-spin text-[#7c3aed]" />
            <p className="text-sm" style={{ color: "var(--ds-text-muted)" }}>
              Davet bilgisi yükleniyor...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="invite-page">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <h2 className="text-xl font-bold" style={{ color: "var(--ds-text-active)" }}>
              Geçersiz Davet
            </h2>
            <p className="text-sm" style={{ color: "var(--ds-text-muted)" }}>
              Bu davet linki geçersiz ya da süresi dolmuş olabilir.
            </p>
            <Button variant="ghost" onClick={() => navigate("/")}>
              Ana Sayfaya Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { name, icon, memberCount } = data;

  return (
    <div className="invite-page">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
          {/* Server icon */}
          <div className="size-20 rounded-2xl bg-[#7c3aed] flex items-center justify-center text-3xl font-bold text-white shadow-lg">
            {icon || name.slice(0, 2).toUpperCase()}
          </div>

          <div className="space-y-1">
            <p
              className="text-xs uppercase tracking-wider"
              style={{ color: "var(--ds-text-muted)" }}
            >
              Davet alındı
            </p>
            <h1 className="text-2xl font-bold" style={{ color: "var(--ds-text-active)" }}>
              {name}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--ds-text-muted)" }}>
            <Users2Icon className="size-4" />
            <span>{memberCount} üye</span>
          </div>

          <Button
            className="w-full"
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending ? "Katılınıyor..." : "Sunucuya Katıl"}
          </Button>

          <Button
            variant="link"
            className="hover:text-[var(--ds-text-normal)]"
            style={{ color: "var(--ds-text-muted)" }}
            onClick={() => navigate("/")}
          >
            İptal
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitePage;
