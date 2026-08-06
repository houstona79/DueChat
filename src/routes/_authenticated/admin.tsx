import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Hash, MessageSquare, ShieldCheck, Trash2, Users } from "lucide-react";
import { Avatar } from "@/components/messenger/Avatar";
import { useAuth } from "@/hooks/use-auth";
import { accentFor, formatTime, isOnline } from "@/lib/chat";
import {
  deleteMessage,
  deleteRoom,
  fetchAdminSnapshot,
  grantRole,
  revokeRole,
} from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel — DueChat" },
      { name: "description", content: "Moderate DueChat members, rooms and messages." },
      { property: "og:title", content: "Admin panel — DueChat" },
      { property: "og:description", content: "Moderate DueChat members, rooms and messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Tab = "overview" | "users" | "rooms" | "messages";

function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-snapshot"],
    queryFn: fetchAdminSnapshot,
    enabled: !!user,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-snapshot"] });

  const roleMutation = useMutation({
    mutationFn: ({ userId, make }: { userId: string; make: boolean }) =>
      make ? grantRole(userId, "admin") : revokeRole(userId, "admin"),
    onSuccess: refresh,
  });
  const roomMutation = useMutation({ mutationFn: deleteRoom, onSuccess: refresh });
  const messageMutation = useMutation({ mutationFn: deleteMessage, onSuccess: refresh });

  const isAdmin = useMemo(
    () => !!user && !!data?.roles.some((r) => r.user_id === user.id && r.role === "admin"),
    [data, user],
  );

  const nameOf = (id: string) =>
    data?.profiles.find((p) => p.id === id)?.display_name ?? "Unknown";

  if (isLoading) {
    return <Shell><p className="text-sm text-muted-foreground">Loading…</p></Shell>;
  }

  if (error || !data) {
    return (
      <Shell>
        <p className="text-sm text-destructive">Could not load admin data.</p>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-6">
          <ShieldCheck className="mb-3 size-6 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Admins only</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account doesn’t have admin access to DueChat.
          </p>
        </div>
      </Shell>
    );
  }

  const groupRooms = data.rooms.filter((r) => !r.is_direct);
  const onlineCount = data.profiles.filter(isOnline).length;
  const stats = [
    { label: "Members", value: data.profiles.length, icon: Users },
    { label: "Online now", value: onlineCount, icon: ShieldCheck },
    { label: "Rooms", value: groupRooms.length, icon: Hash },
    { label: "Recent messages", value: data.messages.length, icon: MessageSquare },
  ];

  return (
    <Shell>
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-secondary p-1">
        {(["overview", "users", "rooms", "messages"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium capitalize ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
              <s.icon className="size-4 text-muted-foreground" />
              <p className="mt-3 text-2xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
          <div className="col-span-2 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Direct conversations</p>
            <p className="mt-1 text-2xl font-semibold">
              {data.rooms.length - groupRooms.length}
            </p>
          </div>
        </div>
      )}

      {tab === "users" && (
        <ul className="mt-5 space-y-2">
          {data.profiles.map((p) => {
            const admin = data.roles.some((r) => r.user_id === p.id && r.role === "admin");
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5"
              >
                <Avatar
                  name={p.display_name}
                  accent={accentFor(p.id)}
                  avatarPath={p.avatar_url}
                  online={isOnline(p)}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.display_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{p.username} · {isOnline(p) ? "Online" : `Seen ${formatTime(p.last_seen_at)}`}
                  </p>
                </div>
                <button
                  disabled={roleMutation.isPending || p.id === user?.id}
                  onClick={() => roleMutation.mutate({ userId: p.id, make: !admin })}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                    admin ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {admin ? "Admin" : "Make admin"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "rooms" && (
        <ul className="mt-5 space-y-2">
          {groupRooms.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {data.memberships.filter((m) => m.room_id === r.id).length} members · by{" "}
                  {nameOf(r.created_by)}
                </p>
              </div>
              <button
                aria-label={`Delete ${r.name}`}
                disabled={roomMutation.isPending}
                onClick={() => roomMutation.mutate(r.id)}
                className="grid size-10 shrink-0 place-items-center rounded-xl text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
          {groupRooms.length === 0 && (
            <p className="text-sm text-muted-foreground">No rooms yet.</p>
          )}
        </ul>
      )}

      {tab === "messages" && (
        <ul className="mt-5 space-y-2">
          {data.messages.map((m) => (
            <li
              key={m.id}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {nameOf(m.user_id)} · {formatTime(m.created_at)}
                </p>
                <p className="mt-1 break-words text-sm">{m.body}</p>
              </div>
              <button
                aria-label="Delete message"
                disabled={messageMutation.isPending}
                onClick={() => messageMutation.mutate(m.id)}
                className="grid size-10 shrink-0 place-items-center rounded-xl text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto min-h-dvh w-full max-w-2xl px-5 pb-10"
      style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top))" }}
    >
      <div className="mb-5 flex items-center gap-3">
        <Link
          to="/chat"
          aria-label="Back to chat"
          className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-2xl font-semibold">Admin panel</h1>
      </div>
      {children}
    </main>
  );
}
