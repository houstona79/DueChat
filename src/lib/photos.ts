import { supabase } from "@/integrations/supabase/client";

export type ProfilePhoto = {
  id: string;
  user_id: string;
  path: string;
  caption: string | null;
  created_at: string;
};

export const MAX_PROFILE_PHOTOS = 12;
const MAX_BYTES = 8 * 1024 * 1024;

export async function fetchProfilePhotos(userId: string) {
  const { data, error } = await supabase
    .from("profile_photos")
    .select("id,user_id,path,caption,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProfilePhoto[];
}

export async function uploadProfilePhoto(userId: string, file: File, caption?: string) {
  if (!file.type.startsWith("image/")) throw new Error("Please pick an image file.");
  if (file.size > MAX_BYTES) throw new Error("That image is larger than 8 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: false });
  if (upErr) throw upErr;
  const { error } = await supabase
    .from("profile_photos")
    .insert({ user_id: userId, path, caption: caption?.trim().slice(0, 140) || null });
  if (error) throw error;
  return path;
}

export async function deleteProfilePhoto(photo: ProfilePhoto) {
  const { error } = await supabase.from("profile_photos").delete().eq("id", photo.id);
  if (error) throw error;
  await supabase.storage.from("avatars").remove([photo.path]);
}

export async function updatePhotoCaption(photoId: string, caption: string) {
  const { error } = await supabase
    .from("profile_photos")
    .update({ caption: caption.trim().slice(0, 140) || null })
    .eq("id", photoId);
  if (error) throw error;
}

export async function signedPhotoUrl(path: string) {
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}
