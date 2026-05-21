import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { getUserSettings, updateUserSettings } from "../lib/api";

const UserSettingsModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["userSettings"],
    queryFn: getUserSettings,
    staleTime: Infinity,
  });

  const sentimentEnabled = data?.settings?.sentimentAnalysisEnabled ?? true;

  const handleToggle = async () => {
    const newValue = !sentimentEnabled;
    setIsSaving(true);
    try {
      await updateUserSettings({ sentimentAnalysisEnabled: newValue });
      await queryClient.invalidateQueries({ queryKey: ["userSettings"] });
      toast.success("Ayarlar kaydedildi");
    } catch {
      toast.error("Ayarlar kaydedilemedi");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal__header">
          <h3>Kullanıcı Ayarları</h3>
          <button className="settings-modal__close" onClick={onClose}>
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="settings-modal__body">
          <p className="settings-modal__section-title">Özellikler</p>

          <div className="settings-row">
            <div className="settings-row__info">
              <p className="settings-row__title">Duygu Analizi</p>
              <p className="settings-row__desc">
                Mesajların yanında duygu analizi rozetlerini göster ve Analyze butonunu etkinleştir
              </p>
            </div>
            <button
              className={`settings-toggle ${sentimentEnabled ? "settings-toggle--on" : "settings-toggle--off"}`}
              onClick={handleToggle}
              disabled={isSaving}
              aria-label="Duygu analizini aç/kapat"
            >
              <span className="settings-toggle__thumb" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsModal;
