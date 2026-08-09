import { supabase } from "@/integrations/supabase/client";

export type Block = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

export async function fetchBlocks(blockerId: string): Promise<Block[]> {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("id, blocker_id, blocked_id, created_at")
    .eq("blocker_id", blockerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from("user_blocks")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error && error.code !== "23505") throw error;
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

/** Hide messages and rows from people on my block list. */
export function isBlocked(blocks: Block[] | undefined, userId: string) {
  return (blocks ?? []).some((b) => b.blocked_id === userId);
}
