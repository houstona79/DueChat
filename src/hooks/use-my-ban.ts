import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Whether the signed-in member is banned from DueChat. Banned members keep
 * access to live support so they can appeal.
 */
export function useMyBan(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-ban", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase
        .from("site_bans")
        .select("reason, created_at")
        .eq("user_id", userId!)
        .maybeSingle();
      return data ?? null;
    },
  });
}