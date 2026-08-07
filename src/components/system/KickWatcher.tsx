import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Listens for a kick record aimed at the signed-in member and immediately signs
 * them out of DueChat. Mounted once at the root.
 */
export function KickWatcher() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    let currentUserId: string | null = null;

    const boot = async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId || cancelled) return;
      if (currentUserId === userId && channel) return;
      currentUserId = userId;
      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      channel = supabase
        .channel(`kicks:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "session_kicks",
            filter: `user_id=eq.${userId}`,
          },
          async (payload) => {
            const reason = (payload.new as { reason: string | null } | null)?.reason;
            toast.error(
              reason
                ? `You were removed from DueChat: ${reason}`
                : "You were removed from DueChat by a moderator.",
            );
            await queryClient.cancelQueries();
            queryClient.clear();
            await supabase.auth.signOut();
            navigate({ to: "/auth", replace: true });
          },
        )
        .subscribe();
    };

    void boot();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void boot();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [navigate, queryClient]);

  return null;
}
