import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  ChevronDown,
  Hash,
  LogOut,
  MessageSquare,
  MonitorSmartphone,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/messenger/Avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReportQueue } from "@/components/messenger/ReportQueue";
import { ChatLogs } from "@/components/messenger/ChatLogs";
import { NotificationAudit } from "@/components/messenger/NotificationAudit";
import { AlertComposer } from "@/components/messenger/AlertComposer";
import { AdminNav, TAB_META, type AdminTab } from "@/components/admin/AdminNav";
import { SupportInbox } from "@/components/admin/SupportInbox";
import { useAuth } from "@/hooks/use-auth";
import { accentFor, formatTime, isOnline } from "@/lib/chat";
import {
  banUser,
  deleteMessage,
  deleteRoom,
  directParticipants,
  fetchAdminSnapshot,
  fetchRoomTranscript,
  grantRole,
  kickUser,
  revokeRole,
  unbanUser,
} from "@/lib/admin";
import { fetchIpLog, sharedIps } from "@/lib/ip-log";
import { deleteAccount } from "@/lib/accounts.functions";
import { clearSessions, deviceLabel, fetchActiveSessions, multiSessionUsers } from "@/lib/sessions";

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

type Tab = AdminTab;

/** The owner account keeps admin access permanently (also enforced in the database). */
const OWNER_USER_ID = "9ab27da1-753c-4fba-bf47-6932ab7de55c";

function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [openDm, setOpenDm] = useState<string | null>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
    username: string;
  } | null>(null);

  const transcript = useQuery({
    queryKey: ["admin-transcript", openDm],
    queryFn: () => fetchRoomTranscript(openDm!),
    enabled: !!openDm,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-snapshot"],
    queryFn: fetchAdminSnapshot,
    enabled: !!user,
  });

  const sessions = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: fetchActiveSessions,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const ipLog = useQuery({
    queryKey: ["admin-ip-log"],
    queryFn: fetchIpLog,
    enabled: !!user && tab === "ips",
  });

  const clearSessionsMutation = useMutation({
    mutationFn: clearSessions,
    onSuccess: () => {
      toast.success("Session records cleared.");
      void sessions.refetch();
    },
    onError: () => toast.error("Could not clear those sessions."),
  });

  const ipShares = useMemo(() => sharedIps(ipLog.data ?? []), [ipLog.data]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-snapshot"] });

  const roleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
      make,
    }: {
      userId: string;
      role: "admin" | "moderator";
      make: boolean;
    }) => (make ? grantRole(userId, role) : revokeRole(userId, role)),
    onSuccess: refresh,
  });
  const roomMutation = useMutation({ mutationFn: deleteRoom, onSuccess: refresh });
  const messageMutation = useMutation({ mutationFn: deleteMessage, onSuccess: refresh });
  const banMutation = useMutation({
    mutationFn: ({ userId, ban }: { userId: string; ban: boolean }) =>
      ban ? banUser(userId) : unbanUser(userId),
    onSuccess: refresh,
  });
  const kickMutation = useMutation({
    mutationFn: ({ userId }: { userId: string; name: string }) => kickUser(userId),
    onSuccess: (_data, vars) => {
      toast.success(`${vars.name} was kicked off DueChat.`);
      refresh();
    },
    onError: () => toast.error("Could not kick that member."),
  });
  const deleteAccountMutation = useMutation({
    mutationFn: ({ userId }: { userId: string; name: string }) =>
      deleteAccount({ data: { userId } }),
    onSuccess: (_data, vars) => {
      toast.success(`${vars.name}'s account was permanently deleted.`);
      setPendingDelete(null);
      refresh();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "";
      toast.error(message ? `Could not delete that account: ${message}` : "Could not delete that account.");
    },
  });

  const isAdmin = useMemo(
    () => !!user && !!data?.roles.some((r) => r.user_id === user.id && r.role === "admin"),
    [data, user],
  );
  const isOwner = user?.id === OWNER_USER_ID;

  const nameOf = (id: string) => data?.profiles.find((p) => p.id === id)?.display_name ?? "Unknown";

  if (isLoading) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
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
  const liveSessions = sessions.data ?? [];
  /** Admins and moderators are allowed to be signed in from several places. */
  const isStaff = (id: string) =>
    data.roles.some((r) => r.user_id === id && (r.role === "admin" || r.role === "moderator"));
  const flagged = multiSessionUsers(liveSessions).filter((f) => !isStaff(f.userId));
  const staffMulti = multiSessionUsers(liveSessions).filter((f) => isStaff(f.userId));
  const onlineCount = data.profiles.filter(isOnline).length;
  const stats = [
    { label: "Members", value: data.profiles.length, icon: Users },
    { label: "Online now", value: onlineCount, icon: ShieldCheck },
    { label: "Rooms", value: groupRooms.length, icon: Hash },
    { label: "Recent messages", value: data.messages.length, icon: MessageSquare },
    { label: "Multi-nick alerts", value: flagged.length, icon: MonitorSmartphone },
  ];

  return (
    <Shell>
      <AdminNav
        tab={tab}
        onChange={setTab}
        counts={{
          users: data.profiles.length,
          bans: data.bans.length,
          rooms: groupRooms.length,
          sessions: flagged.length,
        }}
      />
      {tab !== "overview" && (
        <button
          type="button"
          onClick={() => setTab("overview")}
          className="mt-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          ← Back to overview
        </button>
      )}

      {tab === "overview" && (
        <>
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
              <p className="mt-1 text-2xl font-semibold">{data.rooms.length - groupRooms.length}</p>
            </div>
          </div>
          <h2 className="mt-6 text-sm font-semibold">Jump to a task</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(["users", "reports", "alerts", "bans", "sessions", "logs"] as Tab[]).map((t) => {
              const m = TAB_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left hover:bg-secondary"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                    <m.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{m.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{m.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === "users" && (
        <>
          <label htmlFor="admin-user-search" className="sr-only">
            Search members
          </label>
          <input
            id="admin-user-search"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search members by name or @username"
            className="mt-5 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <ul className="mt-3 space-y-2">
            {data.profiles
              .filter((p) => {
                const q = userSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  p.display_name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
                );
              })
              .map((p) => {
                const admin = data.roles.some((r) => r.user_id === p.id && r.role === "admin");
                const moderator = data.roles.some(
                  (r) => r.user_id === p.id && r.role === "moderator",
                );
                const locked = p.id === OWNER_USER_ID || p.id === user?.id;
                const banned = data.bans.some((b) => b.user_id === p.id);
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5"
                  >
                    <Avatar
                      name={p.display_name}
                      accent={accentFor(p.id)}
                      avatarPath={p.avatar_url}
                      online={isOnline(p)}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate text-sm font-semibold">{p.display_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{p.username} ·{" "}
                        {isOnline(p) ? "Online" : `Seen ${formatTime(p.last_seen_at)}`}
                      </p>
                    </div>
                    <button
                      disabled={roleMutation.isPending || locked || !isOwner}
                      title={
                        p.id === OWNER_USER_ID
                          ? "Owner account — admin access can’t be removed"
                          : isOwner
                            ? undefined
                            : "Only the owner can assign admins"
                      }
                      onClick={() =>
                        roleMutation.mutate({ userId: p.id, role: "admin", make: !admin })
                      }
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                        admin ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {p.id === OWNER_USER_ID ? "Owner" : admin ? "Admin" : "Make admin"}
                    </button>
                    <button
                      disabled={roleMutation.isPending || locked || admin}
                      title={
                        admin
                          ? "Admins already have every moderator power"
                          : moderator
                            ? "Remove moderator role"
                            : "Make this member a moderator"
                      }
                      onClick={() =>
                        roleMutation.mutate({ userId: p.id, role: "moderator", make: !moderator })
                      }
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                        moderator
                          ? "bg-accent/20 text-accent"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {moderator ? "Moderator" : "Make mod"}
                    </button>
                    <button
                      disabled={banMutation.isPending || locked || (admin && !banned)}
                      title={
                        locked
                          ? "This account can’t be banned"
                          : banned
                            ? "Unban this member"
                            : "Ban this member from DueChat"
                      }
                      onClick={() => banMutation.mutate({ userId: p.id, ban: !banned })}
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                        banned
                          ? "bg-destructive/15 text-destructive"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {banned ? "Unban" : "Ban"}
                    </button>
                    <button
                      disabled={kickMutation.isPending || locked || admin}
                      title={
                        locked
                          ? "This account can’t be kicked"
                          : admin
                            ? "Admins can’t be kicked"
                            : "Sign this member out of DueChat everywhere"
                      }
                      onClick={() => kickMutation.mutate({ userId: p.id, name: p.display_name })}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground disabled:opacity-50"
                    >
                      <LogOut className="size-3.5" />
                      Kick
                    </button>
                    {isOwner && (
                      <button
                        disabled={deleteAccountMutation.isPending || locked}
                        title={
                          locked
                            ? "This account can’t be deleted"
                            : "Permanently delete this account and all of its data"
                        }
                        onClick={() =>
                          setPendingDelete({
                            id: p.id,
                            name: p.display_name,
                            username: p.username,
                          })
                        }
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </button>
                    )}
                  </li>
                );
              })}
          </ul>
        </>
      )}

      {tab === "staff" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Staff roles</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isOwner
                ? "As the owner you can assign or remove Admin and Moderator for any member."
                : "Admins can add or remove moderators. Only the owner can assign admins."}
            </p>
          </div>

          {(["admin", "moderator"] as const).map((role) => {
            const holders = data.profiles.filter((p) =>
              data.roles.some((r) => r.user_id === p.id && r.role === role),
            );
            return (
              <div key={role} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-semibold">
                  {role === "admin" ? "Admins" : "Moderators"} ({holders.length})
                </p>
                <ul className="mt-3 space-y-2">
                  {holders.length === 0 && (
                    <li className="text-xs text-muted-foreground">Nobody has this role yet.</li>
                  )}
                  {holders.map((p) => {
                    const canRemove = p.id !== OWNER_USER_ID && (role === "moderator" || isOwner);
                    return (
                      <li key={p.id} className="flex items-center gap-2">
                        <Avatar
                          name={p.display_name}
                          accent={accentFor(p.id)}
                          avatarPath={p.avatar_url}
                          online={isOnline(p)}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-destructive">
                            {p.display_name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                        </div>
                        <button
                          disabled={roleMutation.isPending || !canRemove}
                          title={
                            p.id === OWNER_USER_ID
                              ? "Owner account — admin access can’t be removed"
                              : canRemove
                                ? `Remove ${role} role`
                                : "Only the owner can remove admins"
                          }
                          onClick={() => roleMutation.mutate({ userId: p.id, role, make: false })}
                          className="shrink-0 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground disabled:opacity-50"
                        >
                          {p.id === OWNER_USER_ID ? "Owner" : "Remove"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Assign a role</p>
            <input
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              placeholder="Search members by name or @username"
              aria-label="Search members by name or username"
              className="mt-3 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <ul className="mt-3 space-y-2">
              {staffSearch.trim().length < 2 && (
                <li className="text-xs text-muted-foreground">
                  Type at least two characters to find a member.
                </li>
              )}
              {staffSearch.trim().length >= 2 &&
                data.profiles
                  .filter((p) => {
                    const q = staffSearch.trim().toLowerCase();
                    return (
                      p.display_name.toLowerCase().includes(q) ||
                      p.username.toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 8)
                  .map((p) => {
                    const admin = data.roles.some((r) => r.user_id === p.id && r.role === "admin");
                    const moderator = data.roles.some(
                      (r) => r.user_id === p.id && r.role === "moderator",
                    );
                    return (
                      <li key={p.id} className="flex flex-wrap items-center gap-2">
                        <Avatar
                          name={p.display_name}
                          accent={accentFor(p.id)}
                          avatarPath={p.avatar_url}
                          online={isOnline(p)}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1 basis-32">
                          <p className="truncate text-sm font-semibold">{p.display_name}</p>
                          <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                        </div>
                        <button
                          disabled={roleMutation.isPending || !isOwner || admin}
                          title={isOwner ? "Assign Admin" : "Only the owner can assign admins"}
                          onClick={() =>
                            roleMutation.mutate({ userId: p.id, role: "admin", make: true })
                          }
                          className="shrink-0 rounded-xl bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-50"
                        >
                          {admin ? "Already admin" : "Make admin"}
                        </button>
                        <button
                          disabled={roleMutation.isPending || admin || moderator}
                          onClick={() =>
                            roleMutation.mutate({ userId: p.id, role: "moderator", make: true })
                          }
                          className="shrink-0 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground disabled:opacity-50"
                        >
                          {moderator ? "Already mod" : "Make moderator"}
                        </button>
                      </li>
                    );
                  })}
            </ul>
          </div>
        </div>
      )}

      {tab === "sessions" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Multi-nick watch</p>
            <p className="mt-1 text-xs text-muted-foreground">
              DueChat allows one active session per member account. Accounts signed in from more
              than one place right now are flagged here. Admins and moderators are exempt and may
              use multiple sessions.
            </p>
          </div>

          {sessions.isLoading && (
            <p className="text-sm text-muted-foreground">Checking sessions…</p>
          )}

          {flagged.length === 0 && !sessions.isLoading && (
            <p className="text-sm text-muted-foreground">
              No duplicate sign-ins detected. {liveSessions.length} session
              {liveSessions.length === 1 ? "" : "s"} active.
            </p>
          )}

          <ul className="space-y-2">
            {flagged.map((f) => (
              <li key={f.userId} className="rounded-2xl border border-destructive/40 bg-card p-3">
                <div className="flex items-center gap-3">
                  <MonitorSmartphone className="size-4 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{nameOf(f.userId)}</p>
                    <p className="text-xs text-destructive">
                      {f.sessions.length} sessions signed in at once
                    </p>
                  </div>
                  <button
                    disabled={clearSessionsMutation.isPending}
                    onClick={() => clearSessionsMutation.mutate(f.userId)}
                    className="shrink-0 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    Clear
                  </button>
                  <button
                    disabled={kickMutation.isPending || f.userId === OWNER_USER_ID}
                    onClick={() =>
                      kickMutation.mutate({ userId: f.userId, name: nameOf(f.userId) })
                    }
                    className="shrink-0 rounded-xl bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-50"
                  >
                    Kick
                  </button>
                </div>
                <ul className="mt-2 space-y-1 border-t border-border pt-2">
                  {f.sessions.map((s) => (
                    <li key={s.id} className="text-xs text-muted-foreground">
                      {deviceLabel(s.user_agent)} · last active {formatTime(s.updated_at)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          {staffMulti.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="text-sm font-semibold">Staff with multiple sessions (allowed)</p>
              <ul className="mt-2 space-y-1">
                {staffMulti.map((f) => (
                  <li key={f.userId} className="text-xs text-muted-foreground">
                    {nameOf(f.userId)} · {f.sessions.length} sessions
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "ips" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">IP addresses</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Connection addresses recorded when members sign in, with VPN/proxy detection. Members
              on a VPN are signed out automatically; admins and moderators are exempt. Visible to
              admins only.
            </p>
          </div>

          {ipLog.isLoading && <p className="text-sm text-muted-foreground">Loading IP log…</p>}
          {ipLog.error && (
            <p className="text-sm text-destructive">Only admins can view IP addresses.</p>
          )}

          {ipShares.length > 0 && (
            <div className="rounded-2xl border border-destructive/40 bg-card p-3">
              <p className="text-sm font-semibold">Shared addresses</p>
              <ul className="mt-2 space-y-1">
                {ipShares.map((s) => (
                  <li key={s.ip} className="text-xs text-muted-foreground">
                    <span className="font-mono">{s.ip}</span> ·{" "}
                    {s.userIds.map((id) => nameOf(id)).join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="space-y-2">
            {(ipLog.data ?? []).map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5"
              >
                <MonitorSmartphone className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{nameOf(r.user_id)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{r.ip}</span> · {deviceLabel(r.user_agent)}
                    {r.network ? ` · ${r.network}` : ""}
                  </p>
                  {r.is_vpn && (
                    <p className="text-xs font-semibold text-destructive">VPN / proxy</p>
                  )}
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">{formatTime(r.updated_at)}</p>
              </li>
            ))}
          </ul>

          {!ipLog.isLoading && (ipLog.data ?? []).length === 0 && !ipLog.error && (
            <p className="text-sm text-muted-foreground">No addresses recorded yet.</p>
          )}
        </div>
      )}

      {tab === "bans" && (
        <ul className="mt-5 space-y-2">
          {data.bans.map((b) => (
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
                className="shrink-0 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-50"
              >
                Unban
              </button>
            </li>
          ))}
          {data.bans.length === 0 && (
            <p className="text-sm text-muted-foreground">Nobody is banned from DueChat.</p>
          )}
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

      {tab === "dms" && (
        <DmTab
          rooms={data.rooms.filter((r) => r.is_direct)}
          nameOf={nameOf}
          openDm={openDm}
          setOpenDm={setOpenDm}
          transcript={transcript}
          onDelete={(id) => messageMutation.mutate(id)}
          deleting={messageMutation.isPending}
        />
      )}

      {tab === "reports" && <ReportQueue />}

      {tab === "logs" && <ChatLogs canClear />}

      {tab === "notifications" && <NotificationAudit />}

      {tab === "support" && <SupportInbox />}

      {tab === "alerts" &&
        (isAdmin ? (
          <AlertComposer />
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            Only admins can send system-wide alerts.
          </p>
        ))}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.name} (@${pendingDelete.username}) will be removed permanently, along with their profile, messages, photos and blogs. This can’t be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAccountMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteAccountMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!pendingDelete) return;
                deleteAccountMutation.mutate({
                  userId: pendingDelete.id,
                  name: pendingDelete.name,
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccountMutation.isPending ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}

function DmTab({
  rooms,
  nameOf,
  openDm,
  setOpenDm,
  transcript,
  onDelete,
  deleting,
}: {
  rooms: { id: string; direct_key: string | null; created_at: string }[];
  nameOf: (id: string) => string;
  openDm: string | null;
  setOpenDm: (id: string | null) => void;
  transcript: { data?: import("@/lib/chat").Message[] | undefined; isLoading: boolean };
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <div className="mt-5 space-y-2">
      <p className="text-xs text-muted-foreground">
        Private conversations are visible to admins for moderation only.
      </p>
      {rooms.map((r) => {
        const [a, b] = directParticipants(r);
        const open = openDm === r.id;
        return (
          <div key={r.id} className="rounded-2xl border border-border bg-card px-3 py-2.5">
            <button
              onClick={() => setOpenDm(open ? null : r.id)}
              className="flex w-full items-center gap-2 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {nameOf(a ?? "")} ↔ {nameOf(b ?? "")}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Started {formatTime(r.created_at)}
                </span>
              </span>
              <ChevronDown
                className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            {open ? (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {transcript.isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading conversation…</p>
                ) : (transcript.data ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No messages in this conversation.</p>
                ) : (
                  (transcript.data ?? []).map((m) => (
                    <div key={m.id} className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-muted-foreground">
                          {nameOf(m.user_id)} · {formatTime(m.created_at)}
                        </p>
                        <p className="mt-0.5 break-words text-sm">{m.body}</p>
                      </div>
                      <button
                        aria-label="Delete message"
                        disabled={deleting}
                        onClick={() => onDelete(m.id)}
                        className="grid size-9 shrink-0 place-items-center rounded-xl text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        );
      })}
      {rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">No direct conversations yet.</p>
      ) : null}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
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
