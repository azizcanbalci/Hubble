import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

function MembersModal({ members, onClose }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kanal Üyeleri</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-80 pr-3">
          <div className="space-y-1">
            {members.map((member, index) => (
              <div key={member.user.id}>
                <div className="flex items-center gap-3 py-2.5 px-1">
                  <Avatar className="size-9">
                    <AvatarImage src={member.user.image} alt={member.user.name} />
                    <AvatarFallback>
                      {(member.user.name || member.user.id).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-[#f2f3f5]">
                    {member.user.name || member.user.id}
                  </span>
                </div>
                {index < members.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default MembersModal;
