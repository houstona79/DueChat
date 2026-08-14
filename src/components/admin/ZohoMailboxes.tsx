import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Inbox, Search, XCircle } from "lucide-react";
import { Avatar } from "@/components/messenger/Avatar";
import { supabase } from "@/integrations/supabase/client";
import { MAIL_DOMAIN, accentFor } from "@/lib/chat";
import { checkZohoMail, manageZohoMailbox } from "@/lib/zoho-mail.functions";

type Action = "approve" | "decline" | "suspend" | "restore" | "reset" | "delete";

type Row = {
  address: string;
  status: string;
  provider: string;
  created_at: string;
  last_error: string | null;
  user_id: string;
  profile: { username: string; display_name: string; avatar_url: string | null } | null;
};

async function fetchZohoMailboxes(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("member_mailboxes")
    .select("address, status, provider, created_at, last_error, user_id")
    .like("provider", "zoho%")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Omit<Row, "profile">[];
  if (rows.length === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("user_id" in rows[0] ? "id" : "id", rows.map((r) => r.user_id));
  const byId = new Map(
    ((profiles ?? []) as Array<{
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    }>).map((p) => [p.id, p]),
  );
  return rows.map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
}

/** Owner view of Zoho Mail: connection state, manual requests and live mailboxes. */
export function ZohoMailboxes({ isOwner = false }: { isOwner?: boolean }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-zoho-mailboxes"],
    queryFn: fetchZohoMailboxes,
  });
  const check = useMutation({ mutationFn: () => checkZohoMail() });
  const manage = useMutation({
    mutationFn: (input: { address: string; action: Action }) => manageZohoMailbox({ data: input }),
    onSuccess: async (res) => {
      setNote(res.message);
      setPassword(res.password ?? null);
      await queryClient.invalidateQueries({ queryKey: ["admin-zoho-mailboxes"] });
    },
    onError: () => setNote("That change didn't go through."),
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (r) =>
        r.address.toLowerCase().includes(q) ||
        (r.profile?.username ?? "").toLowerCase().includes(q) ||
        (r.profile?.display_name ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  const pending = rows.filter((r) => r.status === "pending");
  const live = rows.filter((r) => r.status !== "pending");
  const manual = check.data ? check.data.manual : true;

  return (
    <div className="mt-5 space-y-3">
      {isOwner && (
        <div className="space-y-2 rounded-xl bg-card p-3 ring-1 ring-border">
          <p className="text-sm font-semibold">Zoho Mail</p>
          <p className="text-xs text-muted-foreground">
            Add {MAIL_DOMAIN} in Zoho Mail and verify it with the DNS records Zoho shows, then
            point the domain's MX records at Zoho. With Zoho API credentials, member mailboxes are
            created instantly; without them (free plan) members file a request here and you create
            each account in the Zoho Mail admin console.
          </p>
          <button
            type="button"
            disabled={check.isPending}
            onClick={() => check.mutate()}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
          >
            {check.isPending ? "Checking…" : "Test connection"}
          </button>
          {check.data && (
            <p
              className={`flex items-start gap-1.5 text-xs ${
                check.data.ok ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {check.data.ok ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              )}
              {check.data.message}
            </p>
          )}
        </div>
      )}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Zoho mailboxes"
          aria-label="Search Zoho mailboxes"
          className="w-full rounded-xl bg-secondary py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {note ? <p className="text-xs text-primary">{note}</p> : null}
      {password ? (
        <p className="rounded-xl bg-secondary p-3 text-xs">
          One-time password: <code className="font-semibold">{password}</code>
        </p>
      ) : null}

      {isLoading && <p className="text-sm text-muted-foreground">Loading mailboxes…</p>}
      {error && <p className="text-sm text-destructive">Couldn't load mailboxes.</p>}
      {!isLoading && rows.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Inbox className="size-4" aria-hidden /> No Zoho mailbox requests yet.
        </p>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Awaiting manual creation
          </p>
          <ul className="space-y-2">
            {pending.map((r) => (
              <li key={r.address} className="rounded-xl bg-card p-3 ring-1 ring-border">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    name={r.profile?.display_name ?? r.address}
                    avatarPath={r.profile?.avatar_url ?? null}
                    accent={accentFor(r.profile?.username ?? r.address)}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.address}</p>
                    <p className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                      <Clock className="size-3" aria-hidden />
                      {r.profile ? `@${r.profile.username}` : "unknown member"} ·{" "}
                      {new Date(r.created_at).toLocaleDateString()}
                      {r.last_error?.startsWith("contact:") ? ` · ${r.last_error}` : ""}
                    </p>
                  </div>
                </div>
                {isOwner && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={manage.isPending}
                      onClick={() => manage.mutate({ address: r.address, action: "approve" })}
                      className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      Mark created in Zoho
                    </button>
                    <button
                      type="button"
                      disabled={manage.isPending}
                      onClick={() => manage.mutate({ address: r.address, action: "decline" })}
                      className="rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="space-y-2">
        {live.map((r) => (
          <li key={r.address} className="rounded-xl bg-card p-3 ring-1 ring-border">
            <div className="flex items-center gap-2.5">
              <Avatar
                name={r.profile?.display_name ?? r.address}
                avatarPath={r.profile?.avatar_url ?? null}
                accent={accentFor(r.profile?.username ?? r.address)}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.address}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {r.profile ? `@${r.profile.username}` : "unknown member"} ·{" "}
                  {r.status === "active" ? "Active" : "Suspended"} ·{" "}
                  {r.provider === "zoho" ? "API" : "manual"} ·{" "}
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            {r.last_error && !r.last_error.startsWith("contact:") ? (
              <p className="mt-1.5 text-[11px] text-destructive">{r.last_error}</p>
            ) : null}
            {isOwner && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={manage.isPending}
                  onClick={() =>
                    manage.mutate({
                      address: r.address,
                      action: r.status === "active" ? "suspend" : "restore",
                    })
                  }
                  className="rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-60"
                >
                  {r.status === "active" ? "Suspend" : "Restore"}
                </button>
                {!manual && (
                  <button
                    type="button"
                    disabled={manage.isPending}
                    onClick={() => {
                      setPassword(null);
                      manage.mutate({ address: r.address, action: "reset" });
                    }}
                    className="rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-60"
                  >
                    New password
                  </button>
                )}
                <button
                  type="button"
                  disabled={manage.isPending}
                  onClick={() => manage.mutate({ address: r.address, action: "delete" })}
                  className="rounded-full border border-destructive/40 px-3 py-1.5 text-[11px] font-semibold text-destructive disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
