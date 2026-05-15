import type { ChallengeCompletedEventData } from "@kubeasy/api-schemas/sse-events";
import { useEffect } from "react";

export function useChallengeCelebrationSSE(
  slug: string,
  enabled: boolean,
  onCompleted: (data: ChallengeCompletedEventData) => void,
) {
  useEffect(() => {
    if (!enabled) return;

    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
    const url = `${apiBase}/api/sse/challenge/${slug}`;
    const es = new EventSource(url, { withCredentials: true });

    es.addEventListener("challenge-completed", (event) => {
      try {
        const data = JSON.parse(event.data) as ChallengeCompletedEventData;
        onCompleted(data);
      } catch {
        // Ignore malformed events
      }
    });

    es.addEventListener("error", () => {
      // EventSource auto-reconnects on error — no manual retry needed.
    });

    return () => {
      es.close();
    };
  }, [slug, enabled, onCompleted]);
}
