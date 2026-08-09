import { supabase } from "@/integrations/supabase/client";
import { joinRoom } from "@/lib/chat";

export type RoomInvite = {
  id: string;
  room_id: string;
  inviter_id: string;
  invitee_id: string;
  created_at: string;
};

const cols = "id, room_id, inviter_id, invitee_id, created_at";

/** Invites waiting for the signed-in member. */
export async function fetchMyRoomInvites(userId: string): Promise<RoomInvite[]> {
  const { data, error } = await supabase
    .from("room_invites")
    .select(cols)
    .eq("invitee_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RoomInvite[];
}

/** Invites the signed-in member has already sent for a room. */
export async function fetchSentRoomInvites(roomId: string): Promise<RoomInvite[]> {
  const { data, error } = await supabase.from("room_invites").select(cols).eq("room_id", roomId);
  if (error) throw error;
  return (data ?? []) as RoomInvite[];
}

export async function inviteToRoom(roomId: string, inviterId: string, inviteeId: string) {
  const { error } = await supabase
    .from("room_invites")
    .upsert(
      { room_id: roomId, inviter_id: inviterId, invitee_id: inviteeId },
      { onConflict: "room_id,invitee_id" },
    );
  if (error) throw error;
}

export async function dismissRoomInvite(id: string) {
  const { error } = await supabase.from("room_invites").delete().eq("id", id);
  if (error) throw error;
}

/** Joins the room the invite points at, then clears the invite. */
export async function acceptRoomInvite(invite: RoomInvite, userId: string) {
  await joinRoom(invite.room_id, userId);
  await dismissRoomInvite(invite.id);
}
