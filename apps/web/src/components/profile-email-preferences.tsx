import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { List, Mail } from "lucide-react";
import { toast } from "sonner";
import { Empty, EmptyHeader, EmptyMedia } from "@kubeasy/ui/empty";
import { Switch } from "@kubeasy/ui/switch";
import {
  getEmailTopicsFn,
  updateEmailSubscriptionFn,
} from "@/lib/email.functions";

export function ProfileEmailPreferences() {
  const queryClient = useQueryClient();

  const { data: topics, isLoading } = useQuery({
    queryKey: ["email", "topics"],
    queryFn: () => getEmailTopicsFn(),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { topicId: string; subscribed: boolean }) =>
      updateEmailSubscriptionFn({ data: vars }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["email", "topics"] });
      const prev = queryClient.getQueryData(["email", "topics"]);
      queryClient.setQueryData(["email", "topics"], (old: typeof topics) =>
        old?.map((t) =>
          t.id === vars.topicId ? { ...t, subscribed: vars.subscribed } : t,
        ),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["email", "topics"], context?.prev);
      toast.error("Failed to update email preferences");
    },
    onSuccess: () => toast.success("Email preferences updated"),
  });

  return (
    <div className="bg-secondary neo-border neo-shadow p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary text-primary-foreground neo-border">
          <Mail className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black">Email Preferences</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Control what emails you receive
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      {!isLoading && (!topics || topics.length === 0) ? (
        <Empty>
          <EmptyMedia variant="icon">
            <List />
          </EmptyMedia>
          <EmptyHeader>
            <p className="text-lg font-medium">No email topics available</p>
            <p className="text-sm text-muted-foreground">
              Email subscription topics will appear here when configured.
            </p>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {topics?.map((topic) => (
            <div
              key={topic.id}
              className="flex items-start justify-between p-4 bg-background neo-border"
            >
              <div className="flex-1 mr-4">
                <p className="font-black mb-1">{topic.name}</p>
                {topic.description && (
                  <p className="text-sm text-muted-foreground">
                    {topic.description}
                  </p>
                )}
              </div>
              <Switch
                checked={topic.subscribed}
                disabled={
                  updateMutation.isPending &&
                  updateMutation.variables?.topicId === topic.id
                }
                onCheckedChange={(checked) =>
                  updateMutation.mutate({
                    topicId: topic.id,
                    subscribed: checked,
                  })
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
