import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Check, Copy, Key, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@kubeasy/ui/alert";
import { Button } from "@kubeasy/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kubeasy/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@kubeasy/ui/empty";
import { Input } from "@kubeasy/ui/input";
import { trackApiTokenCopied, trackApiTokenCreated } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";

interface ApiKey {
  id: string;
  name: string | null;
  createdAt: Date | string;
  lastRequest?: Date | string | null;
  requestCount?: number | null;
}

export function ProfileApiTokens() {
  const [showNewTokenDialog, setShowNewTokenDialog] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<{
    id: string;
    name: string | null;
  } | null>(null);

  const {
    data: tokens,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["apiKey.list"],
    queryFn: async () => {
      const { data, error } = await authClient.apiKey.list();
      if (error) throw error;
      const result = data as unknown as { apiKeys: ApiKey[] } | null;
      return result?.apiKeys ?? ([] as ApiKey[]);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await authClient.apiKey.create({ name });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.key) setNewlyCreatedToken(data.key);
      setShowNewTokenDialog(false);
      setNewTokenName("");
      trackApiTokenCreated();
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to create token", {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await authClient.apiKey.delete({ keyId: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setTokenToDelete(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to delete token", {
        description: error.message,
      });
    },
  });

  const handleCreateToken = () => {
    if (!newTokenName.trim()) return;
    createMutation.mutate(newTokenName.trim());
  };

  const handleDeleteToken = (token: { id: string; name: string | null }) => {
    setTokenToDelete(token);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (tokenToDelete) {
      deleteMutation.mutate(tokenToDelete.id);
    }
  };

  const handleCopyToken = (token: string, tokenName = "newly_created") => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    trackApiTokenCopied(tokenName);
    toast.success("Token copied to clipboard");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="bg-secondary neo-border neo-shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary text-primary-foreground neo-border">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black">API Tokens</h2>
            <p className="text-sm text-muted-foreground">
              Manage CLI authentication tokens
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowNewTokenDialog(true)}
          size="sm"
          className="bg-accent text-white neo-border neo-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Token
        </Button>
      </div>

      {/* Newly created token alert */}
      {newlyCreatedToken && (
        <Alert className="mb-4 neo-border-thick bg-accent/10">
          <AlertCircle className="h-5 w-5 text-accent" />
          <AlertDescription className="font-semibold">
            <p className="mb-2">
              Make sure to copy your API token now. You won't be able to see it
              again!
            </p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm bg-background px-3 py-2 neo-border flex-1">
                {newlyCreatedToken}
              </code>
              <Button
                onClick={() => handleCopyToken(newlyCreatedToken)}
                size="sm"
                className="neo-border"
              >
                {copiedToken === newlyCreatedToken ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Button
              onClick={() => setNewlyCreatedToken(null)}
              size="sm"
              variant="outline"
              className="mt-2 neo-border"
            >
              I've saved my token
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* New Token Form */}
      {showNewTokenDialog && (
        <div className="mb-4 p-4 bg-accent/10 neo-border border-accent">
          <h3 className="font-black mb-3">Create New Token</h3>
          <div className="flex gap-2">
            <Input
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder="Token name (e.g., production-cli)"
              className="neo-border font-bold flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleCreateToken()}
              disabled={createMutation.isPending}
            />
            <Button
              onClick={handleCreateToken}
              className="bg-accent text-white neo-border font-bold"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
            <Button
              onClick={() => {
                setShowNewTokenDialog(false);
                setNewTokenName("");
              }}
              variant="outline"
              className="neo-border font-bold"
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Tokens List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-4 bg-background neo-border animate-pulse">
            <div className="h-6 w-32 bg-muted rounded mb-2" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
        ) : !tokens || tokens.length === 0 ? (
          <Empty>
            <EmptyMedia variant="icon">
              <Key />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No API tokens yet</EmptyTitle>
              <EmptyDescription>
                Create one to authenticate with the CLI
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          tokens.map((token) => (
            <div
              key={token.id}
              className="p-4 bg-background neo-border flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="font-black mb-1">{token.name || "Unnamed"}</div>
                <div className="text-xs text-muted-foreground">
                  Created {new Date(token.createdAt).toLocaleDateString()}
                  {token.lastRequest && (
                    <>
                      {" "}
                      · Last used{" "}
                      {new Date(token.lastRequest).toLocaleDateString()}
                    </>
                  )}
                  {token.requestCount !== null &&
                    token.requestCount !== undefined && (
                      <> · {token.requestCount} requests</>
                    )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteToken(token)}
                className="p-2 hover:bg-red-100 neo-border transition-colors"
                title="Delete token"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Token</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the token "
              {tokenToDelete?.name || "Unnamed"}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
              className="neo-border font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 text-white neo-border border-red-800 neo-shadow shadow-red-800 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
