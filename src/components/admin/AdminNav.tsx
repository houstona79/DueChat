import { useState } from "react";
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  Flag,
  Gauge,
  Hash,
  MessageSquare,
  MonitorSmartphone,
  Bell,
  ScrollText,
  Search,
  ShieldCheck,
  Users,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";

export type AdminTab =
  | "overview"
  | "users"
  | "staff"
  | "sessions"
  | "ips"
  | "bans"
  | "rooms"
  | "messages"
  | "logs"
  | "dms"
  | "reports"
  | "notifications"
  | "alerts";

type Meta = { label: string; icon: LucideIcon; hint: string; group: string };

/** Plain-language label, icon and one-line hint for every admin section. */
export const TAB_META: Record<AdminTab, Meta> = {
  overview: { label: "Overview", icon: Gauge, hint: "Key numbers at a glance", group: "Dashboard" },
  users: { label: "Members", icon: Users, hint: "Roles, bans and kicks", group: "People" },
  staff: { label: "Staff", icon: ShieldCheck, hint: "Admins and moderators", group: "People" },
  bans: { label: "Bans", icon: Ban, hint: "Everyone banned from DueChat", group: "People" },
  sessions: {
    label: "Sessions",
    icon: MonitorSmartphone,
    hint: "Who is signed in where",
    group: "Security",
  },
  ips: { label: "IP addresses", icon: Wifi, hint: "Shared IPs and VPN flags", group: "Security" },
  rooms: { label: "Rooms", icon: Hash, hint: "Every chat room", group: "Content" },
  messages: {
    label: "Messages",
    icon: MessageSquare,
    hint: "Latest room messages",
    group: "Content",
  },
  dms: {
    label: "Direct messages",
    icon: MessageSquare,
    hint: "Read 1:1 conversations",
    group: "Content",
  },
  logs: { label: "Chat logs", icon: ScrollText, hint: "Nightly archives", group: "Content" },
  reports: { label: "Reports", icon: Flag, hint: "Abuse reports queue", group: "Moderation" },
  notifications: {
    label: "Notifications",
    icon: Bell,
    hint: "Audit member alerts",
    group: "Moderation",
  },
  alerts: {
    label: "System alerts",
    icon: AlertTriangle,
    hint: "Broadcast to everyone",
    group: "Moderation",
  },
};

const GROUPS: { name: string; tabs: AdminTab[] }[] = [
  { name: "Dashboard", tabs: ["overview"] },
  { name: "People", tabs: ["users", "staff", "bans"] },
  { name: "Security", tabs: ["sessions", "ips"] },
  { name: "Content", tabs: ["rooms", "messages", "dms", "logs"] },
  { name: "Moderation", tabs: ["reports", "notifications", "alerts"] },
];

/**
 * Grouped, searchable section picker. Replaces the long scrolling tab strip so
 * the panel stays readable on a phone.
 */
export function AdminNav({
  tab,
  onChange,
  counts,
}: {
  tab: AdminTab;
  onChange: (t: AdminTab) => void;
  counts?: Partial<Record<AdminTab, number>>;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = TAB_META[tab];
  const query = q.trim().toLowerCase();

  const groups = GROUPS.map((g) => ({
    ...g,
    tabs: g.tabs.filter(
      (t) =>
        !query ||
        TAB_META[t].label.toLowerCase().includes(query) ||
        TAB_META[t].hint.toLowerCase().includes(query),
    ),
  })).filter((g) => g.tabs.length > 0);

  return (
    <nav aria-label="Admin sections">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <current.icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{current.label}</span>
          <span className="block truncate text-xs text-muted-foreground">{current.hint}</span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
          {open ? "Close" : "Change"}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-border bg-card p-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sections"
              aria-label="Search admin sections"
              className="w-full rounded-xl bg-secondary py-2 pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground"
            />
            {q && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>

          {groups.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">No section matches that search.</p>
          )}

          {groups.map((g) => (
            <div key={g.name} className="mt-3">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {g.name}
              </p>
              <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                {g.tabs.map((t) => {
                  const m = TAB_META[t];
                  const count = counts?.[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-current={tab === t ? "page" : undefined}
                      onClick={() => {
                        onChange(t);
                        setOpen(false);
                        setQ("");
                      }}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left ${
                        tab === t ? "bg-primary text-primary-foreground" : "bg-secondary"
                      }`}
                    >
                      <m.icon className="size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{m.label}</span>
                        <span
                          className={`block truncate text-[11px] ${
                            tab === t ? "text-primary-foreground/80" : "text-muted-foreground"
                          }`}
                        >
                          {m.hint}
                        </span>
                      </span>
                      {typeof count === "number" && count > 0 && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            tab === t ? "bg-primary-foreground/20" : "bg-card text-muted-foreground"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
