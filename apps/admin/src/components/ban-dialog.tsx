import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@kubeasy/ui/dialog";
import { Button } from "@kubeasy/ui/button";

interface BanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function BanDialog({
  open,
  onOpenChange,
  userName,
  onConfirm,
  loading = false,
}: BanDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
    }
  }, [open]);

  const handleCancel = () => {
    setReason("");
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm(reason);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban {userName}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-4">
            This will prevent the user from logging in. Provide an optional
            reason.
          </p>
          <textarea
            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            placeholder="Optional reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            Ban User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
