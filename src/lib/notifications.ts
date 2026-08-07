import { supabase } from "@/integrations/supabase/client";

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  kind: string;
  update_id: string | null;
  emoji: string | null;
  preview: string | null;
  read_at: string | null;
  created_at: string;
};

export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,user_id,actor_id,kind,update_id,emoji,preview,read_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
}

export async function clearNotifications(userId: string) {
  const { error } = await supabase.from("notifications").delete().eq("user_id", userId);
  if (error) throw error;
}

export function notificationText(n: Notification) {
  if (n.kind === "reaction") return `reacted ${n.emoji ?? ""} to your update`;
  if (n.kind === "comment") return "replied to your update";
  if (n.kind === "update") return "posted a new update";
  return "interacted with your update";
}
