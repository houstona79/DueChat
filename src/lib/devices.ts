import { supabase } from "@/integrations/supabase/client";

const DEVICE_KEY = "duechat.device-id";
/** Message stashed for the sign-in page when a browser is locked to another nick. */
export const DEVICE_BLOCK_KEY = "duechat.device-blocked";

/** Stable id for this browser (survives sign-out, unlike the per-tab session key). */
export function deviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/** True when this browser already belongs to a different member (staff exempt). */
export async function deviceClaimedByOther(): Promise<boolean> {
  const { data, error } = await supabase.rpc("device_claimed_by_other", {
    _device_id: deviceId(),
  });
  if (error) return false;
  return data === true;
}

/** Binds this browser to the signed-in member (no-op if already theirs). */
export async function claimDevice() {
  await supabase.rpc("claim_device", {
    _device_id: deviceId(),
    _user_agent: typeof navigator === "undefined" ? "" : navigator.userAgent,
  });
}
