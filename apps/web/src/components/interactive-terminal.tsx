import { useEffect, useRef, useState } from "react";

const terminalSequences = [
  {
    command: "kubeasy setup",
    outputs: [
      "🚀 Creating local Kubernetes cluster...",
      "✓ Cluster created successfully",
      "✓ kubectl configured",
      "Ready to start challenges!",
    ],
  },
  {
    command: "kubeasy challenge start pod-basic",
    outputs: [
      "📦 Deploying challenge manifests...",
      "✓ Challenge environment ready",
      "🎯 Fix the crashing pod to complete the challenge",
    ],
  },
  {
    command: "kubectl get pods",
    outputs: [
      "NAME          READY   STATUS             RESTARTS   AGE",
      "nginx-pod     0/1     CrashLoopBackOff   3          2m",
      "❌ Pod is crashing!",
    ],
  },
  {
    command: "kubeasy challenge submit pod-basic",
    outputs: [
      "🔍 Validating your solution...",
      "❌ Validation failed:",
      "  • nginx-pod : Expected=Running, got=CrashLoopBackOff",
      "💡 Fix the issues and try again!",
    ],
  },
  {
    command: "kubectl edit pod nginx-pod",
    outputs: [
      "# Edit the pod configuration...",
      "✓ Pod updated successfully",
      "✓ Pod is now running!",
    ],
  },
  {
    command: "kubeasy challenge submit pod-basic",
    outputs: [
      "🔍 Validating your solution...",
      "✓ All checks passed!",
      "🎉 Challenge completed! +50 XP",
    ],
  },
];

export default function InteractiveTerminal() {
  const [currentSequence, setCurrentSequence] = useState(0);
  const [displayedCommand, setDisplayedCommand] = useState("");
  const [displayedOutputs, setDisplayedOutputs] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(true);
  const commandIndexRef = useRef(0);
  const outputIndexRef = useRef(0);

  useEffect(() => {
    const sequence = terminalSequences[currentSequence];
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    let isCancelled = false;

    commandIndexRef.current = 0;
    outputIndexRef.current = 0;
    setDisplayedCommand("");
    setDisplayedOutputs([]);
    setIsTyping(true);

    const typeCommand = () => {
      if (isCancelled) return;
      if (commandIndexRef.current < sequence.command.length) {
        setDisplayedCommand(
          sequence.command.slice(0, commandIndexRef.current + 1),
        );
        commandIndexRef.current++;
        timeoutIds.push(setTimeout(typeCommand, 50));
      } else {
        setIsTyping(false);
        timeoutIds.push(setTimeout(showOutputs, 300));
      }
    };

    const showOutputs = () => {
      if (isCancelled) return;
      if (outputIndexRef.current < sequence.outputs.length) {
        const currentIndex = outputIndexRef.current;
        setDisplayedOutputs((prev) => {
          if (prev.length > currentIndex) return prev;
          return [...prev, sequence.outputs[currentIndex]];
        });
        outputIndexRef.current++;
        timeoutIds.push(setTimeout(showOutputs, 400));
      } else {
        timeoutIds.push(setTimeout(nextSequence, 2000));
      }
    };

    const nextSequence = () => {
      if (isCancelled) return;
      setCurrentSequence((prev) => (prev + 1) % terminalSequences.length);
    };

    typeCommand();

    return () => {
      isCancelled = true;
      for (const id of timeoutIds) {
        clearTimeout(id);
      }
    };
  }, [currentSequence]);

  return (
    <div className="relative">
      <div className="relative bg-card neo-border-thick neo-shadow-xl rounded-xl p-6 font-mono text-sm">
        <div className="flex items-center gap-2 mb-4 pb-3">
          <div className="flex gap-1.5">
            <div
              className="w-3 h-3 rounded-full bg-destructive neo-border"
              style={{ borderWidth: "2px" }}
            />
            <div
              className="w-3 h-3 rounded-full bg-yellow-400 neo-border"
              style={{ borderWidth: "2px" }}
            />
            <div
              className="w-3 h-3 rounded-full bg-green-500 neo-border"
              style={{ borderWidth: "2px" }}
            />
          </div>
          <span className="text-muted-foreground text-xs font-bold">
            terminal
          </span>
        </div>
        <div className="space-y-2 font-bold min-h-[250px]">
          <div>
            <span className="text-primary">$</span>{" "}
            <span className="text-foreground">{displayedCommand}</span>
            {isTyping && <span className="animate-pulse">▊</span>}
          </div>
          {displayedOutputs.map((output) => {
            if (!output) return null;
            return (
              <div
                key={output}
                className={
                  output.startsWith(">")
                    ? "text-muted-foreground"
                    : output.startsWith("✓")
                      ? "text-green-500 mt-4"
                      : output.startsWith("❌")
                        ? "text-destructive mt-4"
                        : "text-muted-foreground"
                }
              >
                {output}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
