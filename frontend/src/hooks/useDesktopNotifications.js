import { useEffect, useState } from "react";

export function useDesktopNotifications(chatClient, settings, activeChannelRef) {
  const enabled = settings?.desktopNotifications ?? true;

  // İzin değişimlerini takip et (navigator.permissions API)
  const [permission, setPermission] = useState(
    () => ("Notification" in window ? Notification.permission : "default")
  );

  useEffect(() => {
    if (!("Notification" in window) || !navigator.permissions) return;
    let status;
    navigator.permissions.query({ name: "notifications" }).then((s) => {
      status = s;
      s.onchange = () => setPermission(Notification.permission);
    });
    return () => { if (status) status.onchange = null; };
  }, []);

  useEffect(() => {
    if (!chatClient || !enabled) return;
    if (!("Notification" in window)) return;

    const show = (event) => {
      // İzni event anında kontrol et (sonradan verilmiş olabilir)
      if (Notification.permission !== "granted") return;

      const msg = event.message;
      if (!msg?.text) return;
      if (msg.user?.id === chatClient.userID) return; // kendi mesajımızı bildir

      // Mesajın hangi kanaldan geldiğini bul
      const msgChannelId = event.cid?.split?.(":")?.[1] ?? event.channel_id ?? null;
      const currentChannelId = activeChannelRef?.current ?? null;

      // Aktif kanaldaysa VE pencere odaktaysa bildiri gösterme
      if (msgChannelId && msgChannelId === currentChannelId && document.hasFocus()) return;

      const notif = new Notification(msg.user?.name ?? "Yeni Mesaj", {
        body: msg.text.slice(0, 120),
        icon: msg.user?.image ?? "/logo.png",
        tag: msgChannelId ?? "hubble-notif",
        renotify: true,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    };

    // message.new  → aktif izlenen kanallardaki mesajlar
    // notification.message_new → izlenmeyen / arka plan kanalları
    const sub1 = chatClient.on("message.new", show);
    const sub2 = chatClient.on("notification.message_new", show);

    return () => {
      sub1?.unsubscribe?.();
      sub2?.unsubscribe?.();
    };
  // permission değişince (izin verilince) listener'ı yeniden kur
  }, [chatClient, enabled, permission]);
}
