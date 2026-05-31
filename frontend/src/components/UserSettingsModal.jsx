import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getUserSettings, updateUserSettings, updateProfile } from "../lib/api";
import { useAppAuth } from "../context/AppAuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BellIcon, LockIcon, UserIcon, CheckIcon, XIcon, HelpCircleIcon } from "lucide-react";

/* ── küçük yardımcı: ayar satırı ────────────────────────────────── */
const SettingRow = ({ label, description, id, checked, onCheckedChange, disabled }) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <div className="flex-1 min-w-0">
      <p
        className="text-sm font-medium"
        style={{ color: "var(--ds-text-normal)" }}
        id={id}
      >
        {label}
      </p>
      {description && (
        <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-muted)" }}>
          {description}
        </p>
      )}
    </div>
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
    />
  </div>
);

/* ── izin durumu badge'i ─────────────────────────────────────────── */
const PermissionBadge = ({ permission }) => {
  if (permission === "granted")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400">
        <CheckIcon className="size-3" /> İzin verildi
      </span>
    );
  if (permission === "denied")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#f23f43]">
        <XIcon className="size-3" /> İzin reddedildi
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--ds-text-muted)" }}>
      <HelpCircleIcon className="size-3" /> Sorulmadı
    </span>
  );
};

/* ── ana modal ───────────────────────────────────────────────────── */
const UserSettingsModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const { currentUser, isCustomSignedIn, updateCurrentUser } = useAppAuth();

  const [saving, setSaving] = useState(false);

  // Profil formu state'leri
  const [profileName, setProfileName] = useState(currentUser?.name ?? "");
  const [profileImage, setProfileImage] = useState(currentUser?.image ?? "");
  const [profileSaving, setProfileSaving] = useState(false);

  // Notification izin durumu
  const [notifPermission, setNotifPermission] = useState(
    "Notification" in window ? Notification.permission : "denied"
  );

  const { data } = useQuery({
    queryKey: ["userSettings"],
    queryFn: getUserSettings,
    staleTime: Infinity,
  });
  const settings = data?.settings ?? {};

  const toggle = async (key) => {
    const current = settings[key] ?? true;
    setSaving(true);
    try {
      await updateUserSettings({ [key]: !current });
      await queryClient.invalidateQueries({ queryKey: ["userSettings"] });
    } catch {
      toast.error("Ayar kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestNotifPermission = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === "granted") toast.success("Bildirim izni verildi");
    else toast.error("Bildirim izni reddedildi");
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return toast.error("İsim boş olamaz");
    setProfileSaving(true);
    try {
      const { user } = await updateProfile(
        profileName.trim(),
        profileImage.trim() || undefined
      );
      updateCurrentUser({ name: user.name, image: user.image });
      toast.success("Profil güncellendi");
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Profil güncellenemedi");
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kullanıcı Ayarları</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="account" className="gap-1.5 text-xs">
              <UserIcon className="size-3.5" />
              Hesap
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs">
              <BellIcon className="size-3.5" />
              Bildirimler
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-1.5 text-xs">
              <LockIcon className="size-3.5" />
              Gizlilik
            </TabsTrigger>
          </TabsList>

          {/* ── Hesap Tab ────────────────────────────────────────── */}
          <TabsContent value="account" className="mt-4 space-y-4">
            {!isCustomSignedIn ? (
              <div
                className="rounded-lg p-4 text-sm"
                style={{ background: "var(--ds-server-bg)", color: "var(--ds-text-muted)" }}
              >
                Profil ayarlarınızı Clerk hesabınız üzerinden yönetebilirsiniz. Sağ alttaki
                kullanıcı simgesine tıklayarak erişebilirsiniz.
              </div>
            ) : (
              <>
                {/* Avatar önizleme */}
                <div className="flex items-center gap-4">
                  <div className="size-16 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-lg text-white"
                    style={{ background: "var(--ds-accent)" }}
                  >
                    {profileImage ? (
                      <img src={profileImage} alt="avatar" className="size-full object-cover"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    ) : (
                      (profileName?.[0] || "?").toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs mb-1" style={{ color: "var(--ds-text-muted)" }}>
                      Profil Fotoğrafı (URL)
                    </p>
                    <Input
                      placeholder="https://example.com/avatar.png"
                      value={profileImage}
                      onChange={(e) => setProfileImage(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ds-text-muted)" }}>
                    Görünen İsim
                  </p>
                  <Input
                    placeholder="Adınız Soyadınız"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                >
                  {profileSaving ? "Kaydediliyor..." : "Profili Kaydet"}
                </Button>
              </>
            )}
          </TabsContent>

          {/* ── Bildirimler Tab ───────────────────────────────────── */}
          <TabsContent value="notifications" className="mt-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide pb-1" style={{ color: "var(--ds-text-muted)" }}>
              Özellikler
            </p>

            <SettingRow
              id="sentiment-toggle"
              label="Duygu Analizi"
              description="Mesajların yanında duygu analizi rozetlerini göster ve Analyze butonunu etkinleştir"
              checked={settings.sentimentAnalysisEnabled ?? true}
              onCheckedChange={() => toggle("sentimentAnalysisEnabled")}
              disabled={saving}
            />

            <Separator />

            <p className="text-xs font-semibold uppercase tracking-wide pt-2 pb-1" style={{ color: "var(--ds-text-muted)" }}>
              Masaüstü Bildirimleri
            </p>

            <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--ds-server-bg)" }}>
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: "var(--ds-text-muted)" }}>
                  Tarayıcı izni:
                </p>
                <PermissionBadge permission={notifPermission} />
              </div>
              {notifPermission !== "granted" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={handleRequestNotifPermission}
                  disabled={notifPermission === "denied"}
                >
                  {notifPermission === "denied"
                    ? "Tarayıcı ayarlarından izin verin"
                    : "Tarayıcı İzni İste"}
                </Button>
              )}
            </div>

            <SettingRow
              id="desktop-notif-toggle"
              label="Masaüstü Bildirimleri"
              description="Yeni mesaj gelince pencere arka plandayken bildirim göster"
              checked={settings.desktopNotifications ?? true}
              onCheckedChange={() => toggle("desktopNotifications")}
              disabled={saving}
            />

            <SettingRow
              id="sound-toggle"
              label="Bildirim Sesi"
              description="Yeni mesaj gelince ses çalınsın"
              checked={settings.soundEnabled ?? true}
              onCheckedChange={() => toggle("soundEnabled")}
              disabled={saving}
            />
          </TabsContent>

          {/* ── Gizlilik Tab ─────────────────────────────────────── */}
          <TabsContent value="privacy" className="mt-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide pb-1" style={{ color: "var(--ds-text-muted)" }}>
              Gizlilik
            </p>

            <SettingRow
              id="friend-req-toggle"
              label="Arkadaşlık İsteklerine İzin Ver"
              description="Diğer kullanıcılar sana arkadaşlık isteği gönderebilsin"
              checked={settings.allowFriendRequests ?? true}
              onCheckedChange={() => toggle("allowFriendRequests")}
              disabled={saving}
            />

            <SettingRow
              id="online-status-toggle"
              label="Online Durumu Göster"
              description="Çevrimiçi olduğunuzda diğer kullanıcılar bunu görebilsin"
              checked={settings.showOnlineStatus ?? true}
              onCheckedChange={() => toggle("showOnlineStatus")}
              disabled={saving}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UserSettingsModal;
