import {
  type ChallengeCompletedEventData,
  ChallengeCompletedEventDataSchema,
} from "@kubeasy/api-schemas/sse-events";
import { useEffect, useRef } from "react";

export function useChallengeCelebrationSSE(
  slug: string,
  enabled: boolean,
  onCompleted: (data: ChallengeCompletedEventData) => void,
) {
  // Stable ref so the effect doesn't reconnect when the callback identity changes
  const onCompletedRef = useRef(onCompleted);
  useEffect(() => {
    onCompletedRef.current = onCompleted;
  });

  useEffect(() => {
    if (!enabled) return;

    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
    const url = `${apiBase}/api/sse/challenge/${slug}`;
    const es = new EventSource(url, { withCredentials: true });

    es.addEventListener("challenge-completed", (event) => {
      const result = ChallengeCompletedEventDataSchema.safeParse(
        JSON.parse(event.data),
      );
      if (result.success) {
        onCompletedRef.current(result.data);
      }
    });

    es.addEventListener("error", () => {
      // EventSource auto-reconnects on error — no manual retry needed.
    });

    return () => {
      es.close();
    };
  }, [slug, enabled]);
}
