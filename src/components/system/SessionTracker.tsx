import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { endSession, touchSession } from "@/lib/sessions";

const HEARTBEAT_MS = 60_000;

/**
 * Keeps a record of the current sign-in so admins can see accounts logged in
 * from several places at once (multi-nick detection). Mounted once at the root.
 */
export function SessionTracker() {
  useEffect(() => {
    let userId: string | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const beat = async () => {
      if (!userId) return;
      try {
        await touchSession(userId);
      } catch {
        /* offline or signed out — retry on the next beat */
      }
    };

    const boot = async () => {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? null;
      if (cancelled || !id) return;
      userId = id;
      void beat();
      if (!timer) timer = setInterval(beat, HEARTBEAT_MS);
    };

    void boot();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void boot();
      if (event === "SIGNED_OUT") {
        const leaving = userId;
        userId = null;
        if (leaving) void endSession(leaving);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (timer) clearInterval(timer);
      if (userId) void endSession(userId);
    };
  }, []);

  return null;
}
