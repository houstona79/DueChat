import { supabase } from "@/integrations/supabase/client";

export type RoomPost = {
  id: string;
  room_id: string;
  user_id: string;
  body: string;
  media_url: string | null;
  created_at: string;
};

export type RoomPostLike = { id: string; post_id: string; user_id: string };
export type RoomPostComment = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export const MAX_POST_LENGTH = 1000;
export const MAX_COMMENT_LENGTH = 500;

export async function fetchRoomPosts(roomId: string) {
  const { data, error } = await supabase
    .from("room_posts")
    .select("id,room_id,user_id,body,media_url,created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as RoomPost[];
}

export async function fetchPostLikes(postIds: string[]) {
  if (postIds.length === 0) return [];
  const { data, error } = await supabase
    .from("room_post_likes")
    .select("id,post_id,user_id")
    .in("post_id", postIds);
  if (error) throw error;
  return (data ?? []) as RoomPostLike[];
}

export async function fetchPostComments(postIds: string[]) {
  if (postIds.length === 0) return [];
  const { data, error } = await supabase
    .from("room_post_comments")
    .select("id,post_id,user_id,body,created_at")
    .in("post_id", postIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoomPostComment[];
}

export async function createRoomPost(roomId: string, userId: string, body: string) {
  const text = body.trim().slice(0, MAX_POST_LENGTH);
  if (!text) throw new Error("Write something first.");
  const media = /^https:\/\/\S+$/i.test(text) ? text : null;
  const { error } = await supabase
    .from("room_posts")
    .insert({ room_id: roomId, user_id: userId, body: text, media_url: media });
  if (error) throw error;
}

export async function deleteRoomPost(postId: string) {
  const { error } = await supabase.from("room_posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function togglePostLike(postId: string, userId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase
      .from("room_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("room_post_likes")
    .insert({ post_id: postId, user_id: userId });
  if (error) throw error;
}

export async function addPostComment(postId: string, userId: string, body: string) {
  const text = body.trim().slice(0, MAX_COMMENT_LENGTH);
  if (!text) return;
  const { error } = await supabase
    .from("room_post_comments")
    .insert({ post_id: postId, user_id: userId, body: text });
  if (error) throw error;
}

export async function deletePostComment(commentId: string) {
  const { error } = await supabase.from("room_post_comments").delete().eq("id", commentId);
  if (error) throw error;
}
