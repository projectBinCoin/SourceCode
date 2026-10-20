"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Returns false during SSR and the hydration render, true after mount.
 * Use it to gate UI that depends on client-only persisted state (e.g. Zustand
 * persist stores) so the first client render matches the server HTML and
 * React hydration never mismatches.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
