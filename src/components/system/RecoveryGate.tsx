import { useEffect } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isRecoveryUrl, recoveryLinkError } from "@/lib/recovery";

/**
 * Password reset emails redirect to whatever URL the backend allows, which is
 * often the site root rather than /reset-password. Without this, the recovery
 * token silently signs the user in and they never get to choose a password.
 */
export function RecoveryGate() {
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    const path = () => router.state.location.pathname;

    const toReset = () => {
      if (path() === "/reset-password") return;
      const hash = window.location.hash;
      void navigate({ to: "/reset-password", replace: true }).then(() => {
        // Keep the token fragment so supabase-js can still establish the session.
        if (hash && !window.location.hash) window.location.hash = hash;
      });
    };

    if (isRecoveryUrl()) toReset();

    const err = recoveryLinkError();
    if (err && path() !== "/reset-password") {
      void navigate({ to: "/reset-password", replace: true });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") toReset();
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}