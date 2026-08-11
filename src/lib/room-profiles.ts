import { supabase } from "@/integrations/supabase/client";

export type PublicRoomProfile = {
  id: string;
  name: string;
  slug: string;
  topic: string | null;
  status_message: string | null;
  category: string;
  rating: "G" | "R";
  name_color: string | null;
  icon_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  website_label: string | null;
  radio_url: string | null;
  radio_name: string | null;
  created_at: string;
  member_count: number;
  rating_avg: number | null;
  rating_count: number;
};

export type RoomStaffTier = "owner" | "super" | "admin";

export type PublicRoomStaff = {
  user_id: string;
  tier: RoomStaffTier;
  username: string;
  display_name: string;
  avatar_url: string | null;
  name_color: string | null;
  country: string | null;
};

export type PublicRoomReview = {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export const ROOM_STAFF_LABEL: Record<RoomStaffTier, string> = {
  owner: "Owner",
  super: "Super admin",
  admin: "Admin",
};

/** My own star rating for a room, if I left one. */
export async function fetchMyRoomRating(roomId: string, userId: string) {
  const { data, error } = await supabase
    .from("room_ratings")
    .select("id, stars, comment")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function rateRoom(
  roomId: string,
  userId: string,
  stars: number,
  comment: string | null,
) {
  const { error } = await supabase.from("room_ratings").upsert(
    { room_id: roomId, user_id: userId, stars, comment: comment?.trim() || null },
    { onConflict: "room_id,user_id" },
  );
  if (error) throw error;
}

export async function clearRoomRating(roomId: string, userId: string) {
  const { error } = await supabase
    .from("room_ratings")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}
