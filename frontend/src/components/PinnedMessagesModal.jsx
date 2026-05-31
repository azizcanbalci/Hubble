import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

function PinnedMessagesModal({ pinnedMessages, onClose }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sabitlenmiş Mesajlar</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-96 pr-3">
          {pinnedMessages.length === 0 ? (
            <p className="text-center text-sm text-[#949ba4] py-8">
              Sabitlenmiş mesaj yok
            </p>
          ) : (
            <div className="space-y-1">
              {pinnedMessages.map((msg, index) => (
                <div key={msg.id}>
                  <div className="flex items-start gap-3 py-3 px-1">
                    <Avatar className="size-9 shrink-0 mt-0.5">
                      <AvatarImage src={msg.user.image} alt={msg.user.name} />
                      <AvatarFallback className="text-xs">
                        {(msg.user.name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-medium text-[#f2f3f5]">{msg.user.name}</p>
                      <p className="text-sm text-[#dcddde] whitespace-pre-line break-words">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                  {index < pinnedMessages.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default PinnedMessagesModal;
