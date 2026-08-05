import { useSyncExternalStore } from "react";
import { getThreads, subscribe, type Thread } from "@/lib/messenger";

const EMPTY: Thread[] = [];

export function useThreads(): Thread[] {
  return useSyncExternalStore(
    (cb) => {
      const unsub = subscribe(cb);
      return () => {
        unsub();
      };
    },
    getThreads,
    () => EMPTY,
  );
}