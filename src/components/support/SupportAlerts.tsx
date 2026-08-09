import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Pops a toast for admins the moment someone writes in a live support chat.
 * Regular members never receive these notifications, so nothing shows for them.
 */
export function SupportAlerts() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`support-alert:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { kind?: string; preview?: string | null };
          if (row.kind !== "support") return;
          toast("New live support message", {
            description: row.preview ?? "Someone needs help in the support chat.",
            action: {
              label: "Open inbox",
              onClick: () => void navigate({ to: "/admin" }),
            },
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  return null;
}