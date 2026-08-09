import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Avatar } from "./Avatar";
import { supabase } from "@/integrations/supabase/client";
import { notificationText, type Notification } from "@/lib/notifications";
import { relativeTime } from "@/lib/profile-updates";
import { accentFor, fetchProfiles } from "@/lib/chat";

async function fetchAllNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,user_id,actor_id,kind,update_id,emoji,preview,read_at,created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

/** Read-only feed of every member's notifications, for admins and moderators. */
export function NotificationAudit() {
  const [search, setSearch] = useState("");

  const {
    data: items = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: fetchAllNotifications,
    refetchInterval: 30_000,
  });

  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  const nameOf = (id: string | null) =>
    profiles.find((p) => p.id === id)?.display_name ?? "Unknown";
  const profileOf = (id: string | null) => profiles.find((p) => p.id === id);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((n) =>
      [nameOf(n.user_id), nameOf(n.actor_id), n.kind, n.preview ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [items, search, profiles]);

  if (isLoading)
    return <p className="mt-5 text-sm text-muted-foreground">Loading notifications…</p>;
  if (error) {
    return <p className="mt-5 text-sm text-destructive">Could not load notifications.</p>;
  }

  return (
    <section className="mt-5" aria-label="All member notifications">
      <label htmlFor="notif-search" className="sr-only">
        Search notifications
      </label>
      <input
        id="notif-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by member, actor or text…"
        className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
      />
      <p className="mt-2 text-[11px] text-muted-foreground">
        Read-only view of the most recent 300 notifications across all members.
      </p>

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No notifications match that search.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {filtered.map((n) => {
            const actor = profileOf(n.actor_id);
            return (
              <li
                key={n.id}
                className="flex items-start gap-2.5 rounded-2xl border border-border bg-card px-3 py-2.5"
              >
                <Avatar
                  name={actor?.display_name ?? "Someone"}
                  accent={accentFor(n.actor_id ?? n.id)}
                  avatarPath={actor?.avatar_url ?? null}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{nameOf(n.actor_id)}</span>{" "}
                    <span className="text-muted-foreground">{notificationText(n)}</span>{" "}
                    <span className="text-muted-foreground">→</span>{" "}
                    <span className="font-semibold">{nameOf(n.user_id)}</span>
                  </p>
                  {n.preview ? (
                    <p className="truncate text-xs text-muted-foreground">“{n.preview}”</p>
                  ) : null}
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Bell className="size-3" aria-hidden />
                    {n.kind} · {relativeTime(n.created_at)} · {n.read_at ? "read" : "unread"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
