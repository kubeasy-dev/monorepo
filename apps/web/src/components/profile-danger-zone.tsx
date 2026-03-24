import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@kubeasy/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kubeasy/ui/dialog";
import { api } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";

export function ProfileDangerZone() {
  const queryClient = useQueryClient();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const resetProgressMutation = useMutation({
    mutationFn: () => api.user.resetProgress(),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Progress reset successfully", {
        description: `Deleted ${data.deletedChallenges} challenges and ${data.deletedXp} XP`,
      });
      setResetDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to reset progress", {
        description: error.message,
      });
      setResetDialogOpen(false);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.deleteUser();
      if (error) throw error;
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error("Failed to delete account", { description: error.message });
    },
  });

  const handleResetProgress = () => {
    setResetDialogOpen(true);
  };

  const confirmReset = () => {
    resetProgressMutation.mutate();
  };

  return (
    <div className="bg-red-50 neo-border-destructive shadow-danger p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-600 text-white neo-border-destructive">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-red-600">Danger Zone</h2>
          <p className="text-sm text-red-700 font-bold">
            Irreversible actions - proceed with caution
          </p>
        </div>
      </div>

      <div className="p-4 bg-white neo-border-destructive mb-4">
        <h3 className="font-black mb-2">Reset All Progress</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This will permanently delete all your completed challenges, progress,
          and statistics. This action cannot be undone.
        </p>
        <Button
          onClick={handleResetProgress}
          disabled={resetProgressMutation.isPending}
          className="bg-red-600 text-white neo-border-destructive shadow-danger hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Reset All Progress
        </Button>
      </div>

      <div className="p-4 bg-white neo-border-destructive">
        <h3 className="font-black mb-2">Delete Account</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        <Button
          onClick={() => setDeleteDialogOpen(true)}
          disabled={deleteAccountMutation.isPending}
          className="bg-red-600 text-white neo-border-destructive shadow-danger hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Delete My Account
        </Button>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="neo-border-destructive shadow-danger">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Reset All Progress
            </DialogTitle>
            <DialogDescription className="text-base">
              <p className="mb-3 font-semibold text-red-800">
                ⚠️ Warning: This action cannot be undone!
              </p>
              <p className="mb-2">This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All your completed challenges</li>
                <li>All your earned XP and rank progress</li>
                <li>All your statistics and history</li>
              </ul>
              <p className="mt-3 font-semibold">
                Are you absolutely sure you want to continue?
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              disabled={resetProgressMutation.isPending}
              className="neo-border font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmReset}
              disabled={resetProgressMutation.isPending}
              className="bg-red-600 text-white neo-border-destructive shadow-danger hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              {resetProgressMutation.isPending
                ? "Resetting..."
                : "Yes, Reset Everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="neo-border-destructive shadow-danger">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Your Account
            </DialogTitle>
            <DialogDescription className="text-base">
              <p className="mb-3 font-semibold text-red-800">
                ⚠️ Warning: This action cannot be undone!
              </p>
              <p className="mb-2">This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your account and all personal data</li>
                <li>All your completed challenges</li>
                <li>All your earned XP and rank progress</li>
              </ul>
              <p className="mt-3 font-semibold">
                Are you absolutely sure you want to delete your account?
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteAccountMutation.isPending}
              className="neo-border font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
              className="bg-red-600 text-white neo-border-destructive shadow-danger hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              {deleteAccountMutation.isPending
                ? "Deleting..."
                : "Yes, Delete My Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
