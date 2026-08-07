import { supabase } from "@/integrations/supabase/client";

export type UpdateComment = {
  id: string;
  update_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export const MAX_COMMENT_LENGTH = 300;

export async function fetchUpdateComments(updateIds: string[]) {
  if (updateIds.length === 0) return [] as UpdateComment[];
  const { data, error } = await supabase
    .from("profile_update_comments")
    .select("id,update_id,user_id,body,created_at,updated_at")
    .in("update_id", updateIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as UpdateComment[];
}

export async function addUpdateComment(updateId: string, userId: string, body: string) {
  const text = body.trim().slice(0, MAX_COMMENT_LENGTH);
  if (!text) throw new Error("Write something first.");
  const { error } = await supabase
    .from("profile_update_comments")
    .insert({ update_id: updateId, user_id: userId, body: text });
  if (error) throw error;
}

export async function deleteUpdateComment(id: string) {
  const { error } = await supabase.from("profile_update_comments").delete().eq("id", id);
  if (error) throw error;
}