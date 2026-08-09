import { supabase } from "@/integrations/supabase/client";

const INVITE_KEY = "duechat.invite-code";

export type InviteOwner = {
  username: string;
  display_name: string;
  avatar_url: string | null;
};

/** The signed-in member's permanent invite code (created on first call). */
export async function fetchMyInviteCode(): Promise<string> {
  const { data, error } = await supabase.rpc("my_invite_code");
  if (error) throw error;
  return (data as string | null) ?? "";
}

/** Full shareable URL for an invite code. */
export function inviteUrl(code: string): string {
  const origin =
    typeof window === "undefined" ? "https://duechat.lovable.app" : window.location.origin;
  return `${origin}/i/${code}`;
}

/** Who is behind an invite code — safe for signed-out visitors. */
export async function fetchInviteOwner(code: string): Promise<InviteOwner | null> {
  const { data, error } = await supabase.rpc("invite_owner", { _code: code.toLowerCase() });
  if (error) throw error;
  const row = (data as InviteOwner[] | null)?.[0];
  return row ?? null;
}

/** People who joined DueChat from your link. */
export async function fetchMyInvitedCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("invite_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("inviter_id", userId);
  if (error) throw error;
  return count ?? 0;
}

export function rememberInvite(code: string) {
  try {
    window.localStorage.setItem(INVITE_KEY, code.toLowerCase());
  } catch {
    /* storage blocked */
  }
}

export function pendingInvite(): string | null {
  try {
    return window.localStorage.getItem(INVITE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  try {
    window.localStorage.removeItem(INVITE_KEY);
  } catch {
    /* storage blocked */
  }
}
