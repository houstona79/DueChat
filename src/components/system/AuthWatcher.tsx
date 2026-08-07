import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const PUBLIC_PREFIXES = ["/auth", "/terms", "/accessibility", "/"];

function isPublicPath(path: string) {
  if (path === "/") return true;
  return PUBLIC_PREFIXES.some((p) => p !== "/" && path.startsWith(p));
}

/**
 * Keeps the client honest about its Supabase session.
 * A revoked/expired refresh token leaves a stale token in storage: every query
 * then fails silently (empty profiles, empty feeds) instead of asking the user
 * to sign in again. This detects that and sends them back to /auth.
 */
export function AuthWatcher() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    const bounce = async () => {
      if (cancelled) return;
      queryClient.clear();
      const path = router.state.location.pathname;
      if (!isPublicPath(path)) {
        await navigate({ to: "/auth", search: { next: path } as never });
      }
    };

    const verify = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (!isPublicPath(router.state.location.pathname)) await bounce();
        return;
      }
      const { error } = await supabase.auth.getUser();
      if (error) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        await bounce();
      }
    };

    void verify();

    const onFocus = () => void verify();
    window.addEventListener("focus", onFocus);

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") void bounce();
      if (event === "SIGNED_IN" || event === "USER_UPDATED") void queryClient.invalidateQueries();
    });

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
