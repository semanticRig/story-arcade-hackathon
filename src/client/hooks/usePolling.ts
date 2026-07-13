import { useEffect, useRef, useCallback } from 'react';

/**
 * Generic polling hook for live community updates.
 * Only polls when enabled and component is visible (document.hidden check).
 * R1 Brain: community sections (canvas, hot take, confessions) currently
 * fetch ONCE on reveal — this makes them feel alive.
 */
export function usePolling(
  fetchFn: () => Promise<unknown>,
  intervalMs: number,
  enabled: boolean,
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enabledRef = useRef(enabled);

  // Sync ref with current enabled state (can't update ref during render)
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const poll = useCallback(() => {
    if (!enabledRef.current) return;
    if (document.hidden) return; // save resources when tab is hidden
    void fetchFn();
  }, [fetchFn]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    void fetchFn();

    // Start polling
    intervalRef.current = setInterval(poll, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, fetchFn, poll]);
}
