import { supabase } from "@/integrations/supabase/client";

/** Free credits handed out once per calendar day. */
export const DAILY_CREDIT_GRANT = 25;

export type GiftItem = {
  key: string;
  label: string;
  emoji: string;
  cost: number;
  sort_order: number;
  image_url: string | null;
};

export type Gift = {
  id: string;
  sender_id: string;
  recipient_id: string;
  room_id: string | null;
  gift_key: string;
  credits: number;
  note: string | null;
  created_at: string;
};

export async function fetchGiftItems(): Promise<GiftItem[]> {
  const { data, error } = await supabase
    .from("gift_items")
    .select("key, label, emoji, cost, sort_order, image_url")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Balance for the signed-in member, granting today's free credits on the way. */
export async function claimDailyCredits(): Promise<number> {
  const { data, error } = await supabase.rpc("claim_daily_credits");
  if (error) throw new Error(error.message || "Could not load your credits.");
  return data ?? 0;
}

export async function fetchBalance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.balance ?? 0;
}

/** Staff-only: balances for every member, keyed by user id. */
export async function fetchAllBalances(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("user_credits").select("user_id, balance");
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const row of data ?? []) map[row.user_id] = row.balance;
  return map;
}

/** Sends a gift and returns the sender's remaining balance. */
export async function sendGift(
  recipientId: string,
  giftKey: string,
  roomId?: string | null,
  note?: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("send_gift", {
    _recipient: recipientId,
    _gift_key: giftKey,
    ...(roomId ? { _room_id: roomId } : {}),
    ...(note?.trim() ? { _note: note.trim() } : {}),
  });
  if (error) throw new Error(error.message || "Could not send that gift.");
  return data ?? 0;
}

export async function fetchGiftsReceived(userId: string): Promise<Gift[]> {
  return fetchGiftsReceivedInner(userId);
}

/** Admin-only: adds credits to a member's balance and returns their new balance. */
export async function grantCredits(
  userId: string,
  amount: number,
  note?: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("grant_credits", {
    _user_id: userId,
    _amount: amount,
    ...(note?.trim() ? { _note: note.trim() } : {}),
  });
  if (error) throw new Error(error.message || "Could not give those credits.");
  return data ?? 0;
}

async function fetchGiftsReceivedInner(userId: string): Promise<Gift[]> {
  const { data, error } = await supabase
    .from("gifts")
    .select("id, sender_id, recipient_id, room_id, gift_key, credits, note, created_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
export type GiftShelfEntry = {
  gift_key: string;
  label: string;
  emoji: string;
  image_url: string | null;
  total: number;
  last_at: string;
};

/** Gifts a member has received, grouped by type (senders stay private). */
export async function fetchGiftShelf(userId: string): Promise<GiftShelfEntry[]> {
  const { data, error } = await supabase.rpc("gift_shelf", { _user_id: userId });
  if (error) throw new Error(error.message || "Could not load gifts.");
  return (data ?? []).map((row) => ({
    gift_key: row.gift_key,
    label: row.label,
    emoji: row.emoji,
    image_url: row.image_url ?? null,
    total: Number(row.total),
    last_at: row.last_at,
  }));
}

/** Sentinel body used to announce a gift inside a chat room. */
export function giftNoticeBody(emoji: string, label: string, recipientName: string) {
  return `::gift::${emoji}|${label}|${recipientName}`;
}

export function giftNoticeOf(body: string) {
  const trimmed = body.trim();
  if (!trimmed.startsWith("::gift::")) return null;
  const [emoji, label, recipientName] = trimmed.slice("::gift::".length).split("|");
  if (!emoji || !label || !recipientName) return null;
  return { emoji, label, recipientName };
}

/** Public "points" total for any member's profile (their credit balance). */
export async function fetchProfilePoints(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("profile_points", { _user_id: userId });
  if (error) throw new Error(error.message || "Could not load points.");
  return data ?? 0;
}
