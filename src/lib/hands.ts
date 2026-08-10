import { supabase } from "@/integrations/supabase/client";

export type RoomHand = {
  id: string;
  room_id: string;
  user_id: string;
  raised_at: string;
  granted_at: string | null;
  granted_by: string | null;
};

const COLS = "id, room_id, user_id, raised_at, granted_at, granted_by";

export async function fetchRoomHands(roomId: string): Promise<RoomHand[]> {
  const { data, error } = await supabase
    .from("room_hands")
    .select(COLS)
    .eq("room_id", roomId)
    .order("raised_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function raiseHand(roomId: string, userId: string) {
  const { error } = await supabase.from("room_hands").insert({ room_id: roomId, user_id: userId });
  if (error && error.code !== "23505") throw error;
}

export async function lowerHand(roomId: string, userId: string) {
  const { error } = await supabase
    .from("room_hands")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Room admins hand the microphone to someone who raised their hand. */
export async function grantMic(roomId: string, userId: string, grantedBy: string) {
  const { error } = await supabase
    .from("room_hands")
    .update({ granted_at: new Date().toISOString(), granted_by: grantedBy })
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function revokeMic(roomId: string, userId: string) {
  const { error } = await supabase
    .from("room_hands")
    .update({ granted_at: null, granted_by: null })
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}