import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { claimDevice, deviceClaimedByOther, DEVICE_BLOCK_KEY } from "@/lib/devices";

/**
 * One account per browser: the first member to sign in from a browser claims it.
 * Anyone else signing in there is signed straight back out — admins and
 * moderators are exempt so staff can use shared machines.
 */
export function DeviceLock() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    const enforce = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      if (await deviceClaimedByOther()) {
        window.sessionStorage.setItem(
          DEVICE_BLOCK_KEY,
          "This browser is already linked to another DueChat account. Only one account may sign in from each browser.",
        );
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut().catch(() => {});
        await navigate({ to: "/auth", replace: true });
        return;
      }
      await claimDevice().catch(() => {});
    };

    void enforce();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void enforce();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
