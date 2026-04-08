"use client";

import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function LLMCopyButton({ markdownUrl }: { markdownUrl: string }) {
  const [state, setState] = useState<"idle" | "loading" | "copied">("idle");

  const handleClick = async () => {
    setState("loading");
    try {
      const res = await fetch(markdownUrl);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
    }
  };

  return (
    <button
      type="button"
      className={cn(
        buttonVariants({ color: "ghost", size: "sm" }),
        "gap-1.5 text-fd-muted-foreground",
      )}
      onClick={handleClick}
      disabled={state === "loading"}
    >
      {state === "loading" && <Loader2 className="size-3.5 animate-spin" />}
      {state === "copied" && <Check className="size-3.5" />}
      {state === "idle" && <Copy className="size-3.5" />}
      {state === "copied" ? "Copied!" : "Copy as Markdown"}
    </button>
  );
}

export function ViewOptions({
  markdownUrl,
  githubUrl,
}: {
  markdownUrl: string;
  githubUrl?: string;
}) {
  return (
    <div className="flex flex-row gap-1 ms-auto">
      <a
        href={markdownUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ color: "ghost", size: "sm" }),
          "gap-1.5 text-fd-muted-foreground",
        )}
      >
        <ExternalLink className="size-3.5" />
        View Markdown
      </a>
      {githubUrl && (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ color: "ghost", size: "sm" }),
            "gap-1.5 text-fd-muted-foreground",
          )}
        >
          <ExternalLink className="size-3.5" />
          View on GitHub
        </a>
      )}
    </div>
  );
}
