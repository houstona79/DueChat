import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { claimDevice, deviceClaimedByOther, DEVICE_BLOCK_KEY } from "@/lib/devices";
import { deviceId } from "@/lib/devices";
import { recordMyIp } from "@/lib/ip-log.functions";

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
      const bounce = async (message: string) => {
        window.sessionStorage.setItem(DEVICE_BLOCK_KEY, message);
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut().catch(() => {});
        await navigate({ to: "/auth", replace: true });
      };
      if (await deviceClaimedByOther()) {
        await bounce(
          "This browser is already linked to another DueChat account. Only one account may sign in from each browser.",
        );
        return;
      }
      await claimDevice().catch(() => {});
      // Log the connection IP for admin review and block VPN/proxy connections.
      const check = await recordMyIp({ data: { deviceId: deviceId() } }).catch(() => null);
      if (check && "vpn" in check && check.vpn) {
        await bounce(
          "DueChat can't be used over a VPN or proxy. Please turn it off and sign in from your normal connection.",
        );
      }
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
