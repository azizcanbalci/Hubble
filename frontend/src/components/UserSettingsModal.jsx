import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getUserSettings, updateUserSettings } from "../lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Kullanıcı Ayarları</DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#949ba4]">Özellikler</p>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="sentiment-toggle" className="text-sm font-medium text-[#f2f3f5] normal-case tracking-normal">
                Duygu Analizi
              </Label>
              <p className="text-xs text-[#949ba4]">
                Mesajların yanında duygu analizi rozetlerini göster ve Analyze butonunu etkinleştir
              </p>
            </div>
            <Switch
              id="sentiment-toggle"
              checked={sentimentEnabled}
              onCheckedChange={handleToggle}
              disabled={isSaving}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSettingsModal;
