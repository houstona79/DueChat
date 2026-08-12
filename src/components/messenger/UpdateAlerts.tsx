import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { playSound, useSoundUnlock } from "@/lib/sounds";

/**
 * Rings and pops a toast when a buddy posts a new update (or reacts/comments on
 * one of yours). The rows are written by database triggers, so we only listen.
 */
export function UpdateAlerts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useSoundUnlock();

  useEffect(() => {
    if (!user) return;
    const meId = user.id;
    const channel = supabase
      .channel(`update-alert:${meId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${meId}`,
        },
        (payload) => {
          const row = payload.new as {
            kind?: string;
            actor_id?: string | null;
            preview?: string | null;
            emoji?: string | null;
          };
          if (!row.kind || !["update", "reaction", "comment"].includes(row.kind)) return;
          if (row.actor_id && row.actor_id === meId) return;

          void queryClient.invalidateQueries({ queryKey: ["notifications"] });

          void (async () => {
            let name = "Someone";
            let username: string | null = null;
            if (row.actor_id) {
              const { data } = await supabase
                .from("profiles")
                .select("display_name,username")
                .eq("id", row.actor_id)
                .maybeSingle();
              name = data?.display_name ?? data?.username ?? name;
              username = data?.username ?? null;
            }

            const title =
              row.kind === "update"
                ? `${name} posted a new update`
                : row.kind === "reaction"
                  ? `${name} reacted ${row.emoji ?? ""} to your update`
                  : `${name} replied to your update`;

            playSound("notification");
            toast(title, {
              description: row.preview ?? undefined,
              ...(username
                ? {
                    action: {
                      label: "View",
                      onClick: () =>
                        void navigate({ to: "/u/$username", params: { username } }),
                    },
                  }
                : {}),
            });
          })();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, navigate, queryClient]);

  return null;
}