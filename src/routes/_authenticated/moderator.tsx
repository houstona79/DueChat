import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  LogOut,
  MessageSquare,
  MonitorSmartphone,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/messenger/Avatar";
import { useAuth } from "@/hooks/use-auth";
import { accentFor, formatTime, isOnline } from "@/lib/chat";
import { banUser, deleteMessage, fetchAdminSnapshot, kickUser, unbanUser } from "@/lib/admin";
import {
  clearSessions,
  deviceLabel,
  fetchActiveSessions,
  multiSessionUsers,
} from "@/lib/sessions";

export const Route = createFileRoute("/_authenticated/moderator")({
  head: () => ({
    meta: [
      { title: "Moderator panel — DueChat" },
      { name: "description", content: "Moderate DueChat members and messages." },
      { property: "og:title", content: "Moderator panel — DueChat" },
      { property: "og:description", content: "Moderate DueChat members and messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModeratorPage,
});

type Tab = "members" | "sessions" | "messages" | "bans" | "reports";

const OWNER_USER_ID = "9ab27da1-753c-4fba-bf47-6932ab7de55c";

function ModeratorPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("members");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-snapshot"],
    queryFn: fetchAdminSnapshot,
    enabled: !!user,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-snapshot"] });
  const fail = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : "That action isn’t allowed for moderators.");

  const sessions = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: fetchActiveSessions,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const clearSessionsMutation = useMutation({
    mutationFn: clearSessions,
    onSuccess: () => {
      toast.success("Session records cleared.");
      void sessions.refetch();
    },
    onError: fail,
  });

  const kickMutation = useMutation({
    mutationFn: ({ userId }: { userId: string; name: string }) => kickUser(userId),
    onSuccess: (_d, vars) => {
      toast.success(`${vars.name} was kicked off DueChat.`);
      void sessions.refetch();
      refresh();
    },
    onError: fail,
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, ban }: { userId: string; ban: boolean }) =>
      ban ? banUser(userId) : unbanUser(userId),
    onSuccess: refresh,
    onError: fail,
  });
  const messageMutation = useMutation({
    mutationFn: deleteMessage,
    onSuccess: refresh,
    onError: fail,
  });

  const myRole = useMemo(
    () => data?.roles.find((r) => r.user_id === user?.id)?.role ?? null,
    [data, user],
  );
  const isStaff = myRole === "moderator" || myRole === "admin";

  const roleOf = (id: string) => data?.roles.find((r) => r.user_id === id)?.role ?? null;
  const nameOf = (id: string) =>
    data?.profiles.find((p) => p.id === id)?.display_name ?? "Unknown";

  if (isLoading) {
    return <Shell><p className="text-sm text-muted-foreground">Loading…</p></Shell>;
  }

  if (error || !data) {
    return <Shell><p className="text-sm text-destructive">Could not load moderation data.</p></Shell>;
  }

  if (!isStaff) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-6">
          <Shield className="mb-3 size-6 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Moderators only</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account doesn’t have moderator access to DueChat.
          </p>
        </div>
      </Shell>
    );
  }

  const myBans = data.bans.filter((b) => myRole === "admin" || b.banned_by === user?.id);

  return (
    <Shell>
      <p className="mb-4 rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        Moderators can remove member messages and ban regular members. Roles, room deletion and
        admin-level bans stay with admins.
      </p>

      <div className="flex gap-1 rounded-2xl bg-secondary p-1">
        {(["members", "sessions", "messages", "bans", "reports"] as Tab[]).map((t) => (
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

      {tab === "members" && (
        <ul className="mt-5 space-y-2">
          {data.profiles.map((p) => {
            const role = roleOf(p.id);
            const banned = data.bans.some((b) => b.user_id === p.id);
            const protectedUser =
              p.id === OWNER_USER_ID || p.id === user?.id || role === "admin" || role === "moderator";
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
                    {role ? ` · ${role}` : ""}
                  </p>
                </div>
                <button
                  disabled={banMutation.isPending || (protectedUser && !banned)}
                  title={protectedUser ? "Only admins can ban this account" : undefined}
                  onClick={() => banMutation.mutate({ userId: p.id, ban: !banned })}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                    banned
                      ? "bg-destructive/15 text-destructive"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {banned ? "Unban" : "Ban"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "sessions" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Multi-nick watch</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Members signed in from more than one place right now. Admins and moderators are
              allowed multiple sessions, so they aren’t flagged.
            </p>
          </div>
          {(() => {
            const flagged = multiSessionUsers(sessions.data ?? []).filter(
              (f) => !roleOf(f.userId),
            );
            if (flagged.length === 0) {
              return (
                <p className="text-sm text-muted-foreground">No duplicate sign-ins right now.</p>
              );
            }
            return flagged.map((f) => (
              <div
                key={f.userId}
                className="rounded-2xl border border-destructive/40 bg-card p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <MonitorSmartphone className="size-4 shrink-0 text-destructive" />
                  <p className="min-w-0 flex-1 basis-32 truncate text-sm font-semibold">
                    {nameOf(f.userId)} · {f.sessions.length} sessions
                  </p>
                  <button
                    disabled={clearSessionsMutation.isPending}
                    onClick={() => clearSessionsMutation.mutate(f.userId)}
                    className="shrink-0 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground disabled:opacity-50"
                  >
                    Clear
                  </button>
                  <button
                    disabled={kickMutation.isPending || f.userId === OWNER_USER_ID}
                    onClick={() =>
                      kickMutation.mutate({ userId: f.userId, name: nameOf(f.userId) })
                    }
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-50"
                  >
                    <LogOut className="size-3.5" />
                    Kick
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {f.sessions.map((s) => (
                    <li key={s.id} className="text-xs text-muted-foreground">
                      {deviceLabel(s.user_agent)} · {formatTime(s.updated_at)}
                    </li>
                  ))}
                </ul>
              </div>
            ));
          })()}
        </div>
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
                disabled={messageMutation.isPending || roleOf(m.user_id) === "admin"}
                title={roleOf(m.user_id) === "admin" ? "Admin messages are protected" : undefined}
                onClick={() => messageMutation.mutate(m.id)}
                className="grid size-10 shrink-0 place-items-center rounded-xl text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
          {data.messages.length === 0 && (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          )}
        </ul>
      )}

      {tab === "bans" && (
        <ul className="mt-5 space-y-2">
          {myBans.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5"
            >
              <Ban className="size-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{nameOf(b.user_id)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Banned {formatTime(b.created_at)} by {nameOf(b.banned_by)}
                  {b.reason ? ` · ${b.reason}` : ""}
                </p>
              </div>
              <button
                disabled={banMutation.isPending}
                onClick={() => banMutation.mutate({ userId: b.user_id, ban: false })}
                className="shrink-0 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                Unban
              </button>
            </li>
          ))}
          {myBans.length === 0 && (
            <p className="text-sm text-muted-foreground">You haven’t banned anyone.</p>
          )}
        </ul>
      )}

      {tab === "reports" && <ReportQueue />}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Stat label="Members" value={data.profiles.length} icon={Users} />
        <Stat label="Recent messages" value={data.messages.length} icon={MessageSquare} />
      </div>
    </Shell>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Icon className="size-4 text-muted-foreground" />
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
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
        <h1 className="text-2xl font-semibold">Moderator panel</h1>
      </div>
      {children}
    </main>
  );
}
