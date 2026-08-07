import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./Avatar";
import { openProfile } from "./ProfileViewer";
import { supabase } from "@/integrations/supabase/client";
import {
  clearNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationText,
} from "@/lib/notifications";
import { relativeTime } from "@/lib/profile-updates";
import { accentFor, type Profile } from "@/lib/chat";
import { cn } from "@/lib/utils";

export function NotificationsPanel({
  me,
  profiles,
}: {
  me: Profile | null | undefined;
  profiles: Profile[];
}) {
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(true);

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", me?.id],
    queryFn: () => fetchNotifications(me!.id),
    enabled: !!me?.id,
  });

  useEffect(() => {
    if (!me?.id) return;
    const channel = supabase
      .channel(`notifications:${me.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${me.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications", me.id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me?.id, queryClient]);

  const unread = items.filter((n) => !n.read_at).length;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications", me?.id] });

  if (!me) return null;

  const actorOf = (id: string | null) => profiles.find((p) => p.id === id);

  return (
    <section className="mb-2">
      <div className="flex items-center gap-1 px-3 pb-1 pt-2">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex min-h-10 flex-1 items-center gap-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          <Bell className="size-3.5" aria-hidden />
          Notifications
          {unread > 0 ? (
            <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
              {unread}
            </span>
          ) : null}
        </button>
        {!collapsed && items.length > 0 ? (
          <>
            <button
              onClick={async () => {
                try {
                  await markAllNotificationsRead(me.id);
                  await refresh();
                } catch {
                  toast.error("Couldn’t mark those read.");
                }
              }}
              aria-label="Mark all notifications read"
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
            >
              <Check className="size-3.5" />
            </button>
            <button
              onClick={async () => {
                try {
                  await clearNotifications(me.id);
                  await refresh();
                } catch {
                  toast.error("Couldn’t clear notifications.");
                }
              }}
              aria-label="Clear notifications"
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        ) : null}
      </div>

      {collapsed ? null : items.length === 0 ? (
        <p className="px-3 pb-2 text-xs text-muted-foreground">
          No notifications yet. Reactions and replies to your updates land here.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((n) => {
            const actor = actorOf(n.actor_id);
            return (
              <li key={n.id}>
                <button
                  onClick={async () => {
                    if (!n.read_at) {
                      try {
                        await markNotificationRead(n.id);
                        await refresh();
                      } catch {
                        /* non-blocking */
                      }
                    }
                    openProfile(n.actor_id ?? me.id);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-secondary",
                    !n.read_at && "bg-secondary/60",
                  )}
                >
                  <Avatar
                    name={actor?.display_name ?? "Someone"}
                    accent={accentFor(n.actor_id ?? n.id)}
                    avatarPath={actor?.avatar_url ?? null}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      <span className="font-semibold">{actor?.display_name ?? "Someone"}</span>{" "}
                      <span className="text-muted-foreground">{notificationText(n)}</span>
                    </span>
                    {n.preview ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        “{n.preview}”
                      </span>
                    ) : null}
                    <span className="block text-[11px] text-muted-foreground">
                      {relativeTime(n.created_at)}
                    </span>
                  </span>
                  {!n.read_at ? (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
