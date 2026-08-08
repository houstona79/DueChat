import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Info, Megaphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  dismissAnnouncement,
  fetchActiveAnnouncements,
  fetchMyDismissals,
  levelLabel,
  type AlertLevel,
} from "@/lib/announcements";

const tone: Record<AlertLevel, string> = {
  info: "bg-primary text-primary-foreground",
  warning: "bg-accent-3 text-background",
  critical: "bg-destructive text-destructive-foreground",
};

function LevelIcon({ level }: { level: AlertLevel }) {
  if (level === "critical") return <AlertTriangle className="size-4 shrink-0" aria-hidden />;
  if (level === "warning") return <Megaphone className="size-4 shrink-0" aria-hidden />;
  return <Info className="size-4 shrink-0" aria-hidden />;
}

/** Site-wide alert bar shown to every signed-in member, published by admins. */
export function SystemAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ["system-alerts"],
    queryFn: fetchActiveAnnouncements,
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const { data: dismissed = [] } = useQuery({
    queryKey: ["system-alert-dismissals", user?.id],
    queryFn: () => fetchMyDismissals(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("system-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const visible = alerts.filter((a) => !dismissed.includes(a.id));
  if (!user || visible.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="System alerts"
      className="fixed inset-x-0 top-0 z-[90] flex flex-col"
    >
      {visible.map((a) => (
        <div
          key={a.id}
          className={`flex items-start gap-2 px-3 py-2 text-sm shadow-lg ${tone[a.level]}`}
        >
          <LevelIcon level={a.level} />
          <p className="min-w-0 flex-1 break-words">
            <span className="font-semibold">{levelLabel(a.level)}:</span> {a.body}
          </p>
          <button
            aria-label="Dismiss this alert"
            onClick={async () => {
              await dismissAnnouncement(a.id, user.id);
              void queryClient.invalidateQueries({ queryKey: ["system-alert-dismissals"] });
            }}
            className="grid size-7 shrink-0 place-items-center rounded-lg hover:bg-background/20"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}