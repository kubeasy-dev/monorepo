import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Subscribe to the generic cache-invalidation SSE channel.
 * On each "invalidate-cache" event, calls queryClient.invalidateQueries
 * with the received queryKey.
 *
 * @param enabled - Whether to connect (e.g., only when challenge is in_progress)
 */
export function useInvalidateCacheSSE(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
    const url = `${apiBase}/api/sse/invalidate-cache`;
    const es = new EventSource(url, { withCredentials: true });

    es.addEventListener("invalidate-cache", (event) => {
      try {
        const data = JSON.parse(event.data) as { queryKey: string[] };
        if (data.queryKey) {
          queryClient.invalidateQueries({ queryKey: data.queryKey });
        }
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
  }, [enabled, queryClient]);
}
