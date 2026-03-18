import type { LatestValidationStatusOutput } from "@kubeasy/api-schemas/progress";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Target,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SubmissionsOutput } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import {
  challengeObjectivesOptions,
  challengeStatusOptions,
  latestValidationOptions,
  submissionsOptions,
} from "@/lib/query-options";
import { cn } from "@/lib/utils";

interface ChallengeMissionProps {
  slug: string;
}

type ObjectiveCategory =
  | "status"
  | "condition"
  | "log"
  | "event"
  | "connectivity";

const CATEGORY_LABELS: Record<string, string> = {
  status: "Status",
  condition: "Condition",
  log: "Logs",
  event: "Events",
  connectivity: "Network",
};

const CATEGORY_COLORS: Record<string, string> = {
  status: "bg-purple-100 text-purple-700",
  condition: "bg-indigo-100 text-indigo-700",
  log: "bg-blue-100 text-blue-700",
  event: "bg-orange-100 text-orange-700",
  connectivity: "bg-cyan-100 text-cyan-700",
};

interface DisplayObjective {
  id: string;
  objectiveKey: string;
  title: string;
  description: string | null;
  category: string;
  status: boolean | null;
  message?: string;
}

export function ChallengeMission({ slug }: ChallengeMissionProps) {
  const [showHistory, setShowHistory] = useState(false);

  const { data: session, isPending: isSessionLoading } =
    authClient.useSession();
  const isAuthenticated = !!session;

  const { data: objectivesData, isLoading: isLoadingObjectives } = useQuery(
    challengeObjectivesOptions(slug),
  );

  const { data: validationStatus, isLoading: isLoadingValidation } = useQuery({
    ...latestValidationOptions(slug),
    enabled: isAuthenticated,
  });

  const { data: submissionsData } = useQuery({
    ...submissionsOptions(slug),
    enabled: isAuthenticated,
  });

  const { data: statusData } = useQuery({
    ...challengeStatusOptions(slug),
    enabled: isAuthenticated,
  });

  const status = statusData?.status ?? "not_started";
  const isLoading =
    isLoadingObjectives ||
    isSessionLoading ||
    (isAuthenticated && isLoadingValidation);

  const displayObjectives = useMemo((): DisplayObjective[] => {
    const predefinedObjectives = objectivesData?.objectives ?? [];
    const submissionObjectives = (
      validationStatus as LatestValidationStatusOutput | undefined
    )?.hasSubmission
      ? ((validationStatus as LatestValidationStatusOutput)
          .objectives as Array<{
          id: string;
          name: string;
          description?: string;
          category: string;
          passed: boolean;
          message?: string;
        }> | null)
      : null;

    if (predefinedObjectives.length === 0 && submissionObjectives) {
      return submissionObjectives.map((obj) => ({
        id: obj.id,
        objectiveKey: obj.id,
        title: obj.name,
        description: obj.description ?? null,
        category: obj.category,
        status: obj.passed,
        message: obj.message,
      }));
    }

    return predefinedObjectives.map((predefined) => {
      const submissionResult = submissionObjectives?.find(
        (sub) => sub.id === predefined.objectiveKey,
      );

      return {
        id: String(predefined.id),
        objectiveKey: predefined.objectiveKey,
        title: predefined.title,
        description: predefined.description,
        category: predefined.category,
        status: submissionResult ? submissionResult.passed : null,
        message: submissionResult?.message,
      };
    });
  }, [objectivesData, validationStatus]);

  const totalObjectives = displayObjectives.length;
  const passedObjectives = displayObjectives.filter(
    (obj) => obj.status === true,
  ).length;
  const hasAnySubmission = displayObjectives.some((obj) => obj.status !== null);
  const isCompleted = status === "completed";

  const StatusIcon = ({ objStatus }: { objStatus: boolean | null }) => {
    if (objStatus === null) {
      return <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />;
    }
    if (objStatus) {
      return <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />;
    }
    return <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />;
  };

  // Get submissions array safely
  const submissions =
    (submissionsData as SubmissionsOutput | undefined)?.submissions ?? [];

  return (
    <Card className="neo-border-thick neo-shadow-xl bg-secondary">
      <CardHeader>
        <CardTitle className="text-2xl font-black flex items-center gap-3">
          <Target className="h-6 w-6" />
          Your Mission
          {totalObjectives > 0 && (
            <span className="ml-auto text-base font-bold">
              {passedObjectives}/{totalObjectives}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">
              Loading validation status...
            </span>
          </div>
        )}

        {/* Success Message - only when completed */}
        {isCompleted && (
          <div className="bg-green-50 neo-border-thick rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
              <p className="font-bold text-green-900">
                Congratulations! You&apos;ve successfully completed this
                challenge.
              </p>
            </div>
          </div>
        )}

        {/* Objectives Checklist */}
        {!isLoading && displayObjectives.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-bold">
              Complete the objectives below and submit your solution:
            </p>

            <div className="space-y-2">
              {displayObjectives.map((obj) => (
                <div
                  key={obj.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg neo-border",
                    obj.status === true
                      ? "bg-green-50"
                      : obj.status === false
                        ? "bg-red-50"
                        : "bg-white",
                  )}
                >
                  <StatusIcon objStatus={obj.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold">{obj.title}</p>
                      <span
                        className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full",
                          CATEGORY_COLORS[obj.category] ||
                            "bg-gray-100 text-gray-700",
                        )}
                      >
                        {CATEGORY_LABELS[obj.category] || obj.category}
                      </span>
                    </div>
                    {obj.description && (
                      <p className="text-sm text-foreground/70 mt-1">
                        {obj.description}
                      </p>
                    )}
                    {obj.message && (
                      <p
                        className={cn(
                          "text-sm mt-2 font-medium",
                          obj.status === true
                            ? "text-green-700"
                            : "text-red-600",
                        )}
                      >
                        {obj.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Last Updated */}
            {hasAnySubmission &&
              (validationStatus as LatestValidationStatusOutput | undefined)
                ?.timestamp && (
                <p className="text-xs text-muted-foreground text-right font-medium">
                  Last updated:{" "}
                  {new Date(
                    String(
                      (validationStatus as LatestValidationStatusOutput)
                        .timestamp,
                    ),
                  ).toLocaleString()}
                </p>
              )}
          </div>
        )}

        {/* CLI Commands */}
        <div className="space-y-3">
          {isCompleted ? (
            <>
              <p className="text-sm font-bold">Clean up the resources with:</p>
              <div className="bg-black text-green-400 p-3 rounded-lg neo-border-thick font-mono text-sm">
                <span className="text-gray-500">$</span> kubeasy challenge clean{" "}
                {slug}
              </div>
            </>
          ) : status === "not_started" ? (
            <>
              <p className="text-sm font-bold">
                Start this challenge in your local Kubernetes cluster:
              </p>
              <div className="bg-black text-green-400 p-3 rounded-lg neo-border-thick font-mono text-sm">
                <span className="text-gray-500">$</span> kubeasy challenge start{" "}
                {slug}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-bold">Submit your solution:</p>
              <div className="bg-black text-green-400 p-3 rounded-lg neo-border-thick font-mono text-sm">
                <span className="text-gray-500">$</span> kubeasy challenge
                submit {slug}
              </div>
            </>
          )}

          {/* History button */}
          {submissions.length > 0 && (
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
              <DialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="neo-border font-bold"
                  />
                }
              >
                <Clock className="h-4 w-4 mr-2" />
                View History ({submissions.length})
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto neo-border-thick">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">
                    Submission History
                  </DialogTitle>
                  <DialogDescription>
                    Previous attempts for this challenge
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="p-4 bg-secondary neo-border-thick flex items-center justify-between"
                    >
                      <span className="font-bold text-sm">
                        {submission.timestamp
                          ? new Date(submission.timestamp).toLocaleString()
                          : "Unknown date"}
                      </span>
                      <span
                        className={cn(
                          "font-bold text-sm px-2 py-0.5 neo-border",
                          submission.validated
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700",
                        )}
                      >
                        {submission.validated ? "Passed" : "Failed"}
                      </span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* No objectives (backward compat) */}
        {!isLoading && displayObjectives.length === 0 && !hasAnySubmission && (
          <p className="text-sm font-medium text-muted-foreground">
            Submit your solution to see validation progress.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
