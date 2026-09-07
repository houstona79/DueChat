import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Lock, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./Avatar";
import { countryFlag } from "@/lib/country-flags";
import { decorationGlyph, decorationLabel } from "@/lib/decorations";
import { useBuddies } from "@/hooks/use-chat";
import { useOpenDirect } from "@/hooks/use-direct";
import {
  siteRoleBadgeClass,
  siteRoleLabel,
  siteRoleOf,
  siteRoleTextClass,
  nameColorStyle,
  useSiteRoles,
} from "@/hooks/use-roles";
import { accentFor, addBuddy, isOnline, removeBuddy, type Profile } from "@/lib/chat";
import { cn } from "@/lib/utils";

const OWNER_USER_ID = "9ab27da1-753c-4fba-bf47-6932ab7de55c";

export function BuddyList({
  profiles,
  me,
}: {
  profiles: Profile[];
  me: Profile | null | undefined;
}) {
  const queryClient = useQueryClient();
  const { data: buddies = [] } = useBuddies(me?.id);
  const { data: roles } = useSiteRoles(!!me?.id);
  const { open: openDirect, pending: dmPending } = useOpenDirect(me?.id);
  const [tab, setTab] = useState<"contacts" | "find">("contacts");
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState({ online: true, offline: true });
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  const buddyIds = useMemo(() => new Set(buddies.map((b) => b.buddy_id)), [buddies]);

  const buddyProfiles = useMemo(
    () =>
      profiles
        .filter((p) => buddyIds.has(p.id))
        .sort(
          (a, b) =>
            Number(isOnline(b)) - Number(isOnline(a)) ||
            a.display_name.localeCompare(b.display_name),
        ),
    [profiles, buddyIds],
  );
  const onlineCount = buddyProfiles.filter(isOnline).length;
  const groups = [
    {
      key: "online" as const,
      label: "Online Friends",
      people: buddyProfiles.filter(isOnline),
    },
    {
      key: "offline" as const,
      label: "Offline Friends",
      people: buddyProfiles.filter((p) => !isOnline(p)),
    },
  ];

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return profiles
      .filter((p) => p.id !== me?.id && !buddyIds.has(p.id))
      .filter((p) => (term ? (p.display_name + p.username).toLowerCase().includes(term) : true))
      .slice(0, 10);
  }, [profiles, buddyIds, me?.id, search]);

  const add = async (id: string, name: string) => {
    if (!me) return;
    try {
      await addBuddy(me.id, id);
      await queryClient.invalidateQueries({ queryKey: ["buddies"] });
      toast.success(`${name} added to your contacts`);
      setSearch("");
    } catch {
      toast.error("Couldn't add that buddy");
    }
  };

  const remove = async (id: string, name: string) => {
    if (!me) return;
    try {
      await removeBuddy(me.id, id);
      await queryClient.invalidateQueries({ queryKey: ["buddies"] });
      toast.success(`${name} removed`);
    } catch {
      toast.error("Couldn't remove that buddy");
    }
  };

  const myRole = siteRoleOf(roles, me?.id ?? "");
  const iAmStaff = myRole === "admin" || myRole === "moderator";
  const lockedFor = (p: Profile) => {
    const theirRole = siteRoleOf(roles, p.id);
    if (p.id === OWNER_USER_ID && iAmStaff) return true;
    if (me?.id === OWNER_USER_ID && (theirRole === "admin" || theirRole === "moderator"))
      return true;
    return false;
  };

  const menuTarget = menu ? buddyProfiles.find((p) => p.id === menu.id) : null;

  return (
    <section className="buddy-panel mx-2 mb-3" ref={panelRef}>
      {/* Tab strip, ZamTalk style */}
      <div className="flex items-end gap-1 border-b border-border px-1">
        <button
          onClick={() => setTab("contacts")}
          className={cn(
            "-mb-px rounded-t-md border border-b-0 px-3 py-1.5 text-[13px] font-bold",
            tab === "contacts"
              ? "border-border bg-card text-foreground"
              : "border-transparent bg-secondary/70 text-muted-foreground hover:text-foreground",
          )}
        >
          Contacts ({buddyProfiles.length})
        </button>
        <button
          onClick={() => setTab("find")}
          className={cn(
            "-mb-px flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-1.5 text-[13px] font-bold",
            tab === "find"
              ? "border-border bg-card text-foreground"
              : "border-transparent bg-secondary/70 text-muted-foreground hover:text-foreground",
          )}
        >
          {tab === "find" ? <X className="size-3.5" /> : <UserPlus className="size-3.5" />}
          Add Friends
        </button>
        <Link
          to="/friends"
          className="-mb-px ml-auto rounded-t-md border border-b-0 border-transparent bg-secondary/70 px-3 py-1.5 text-[13px] font-bold text-muted-foreground hover:text-foreground"
        >
          Friends page
        </Link>

      </div>

      <div className="rounded-b-md border border-t-0 border-border bg-card">
        {tab === "find" ? (
          <div className="p-2">
            <div className="flex items-center gap-2 rounded-sm border border-border bg-background px-2 py-1.5">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find people by name"
                aria-label="Find people to add"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <ul className="mt-1.5">
              {candidates.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => void add(p.id, p.display_name)}
                    className="flex w-full items-center gap-2 px-1.5 py-1 text-left hover:bg-primary/15"
                  >
                    <Avatar
                      name={p.display_name}
                      accent={accentFor(p.id)}
                      avatarPath={p.avatar_url}
                      online={isOnline(p)}
                      size="sm"
                      className="[&>img]:size-8 [&>img]:rounded-sm [&>span]:size-8 [&>span]:rounded-sm [&>span]:text-[10px]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold leading-tight">
                        {p.display_name}
                      </span>
                      <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                        @{p.username}
                      </span>
                    </span>
                    <UserPlus className="size-4 shrink-0 text-primary" aria-hidden />
                  </button>
                </li>
              ))}
              {candidates.length === 0 ? (
                <li className="px-2 py-2 text-xs text-muted-foreground">No people to add.</li>
              ) : null}
            </ul>
          </div>
        ) : (
          <ul className="min-h-[120px] py-1">
            {groups.map((g) => (
              <li key={g.key}>
                <button
                  onClick={() => setOpenGroups((v) => ({ ...v, [g.key]: !v[g.key] }))}
                  aria-expanded={openGroups[g.key]}
                  className="flex w-full items-center gap-2 px-2 py-1 text-left"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "text-[10px] leading-none",
                      g.key === "online" ? "text-primary" : "text-destructive",
                    )}
                  >
                    {openGroups[g.key] ? "▼" : "▶"}
                  </span>
                  <span
                    className={cn(
                      "text-[13px] font-bold",
                      g.key === "online" ? "text-primary" : "text-destructive",
                    )}
                  >
                    {g.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">({g.people.length})</span>
                </button>
                {openGroups[g.key] ? (
                  <ul>
                    {g.people.map((p) => {
                      const role = siteRoleOf(roles, p.id);
                      const online = isOnline(p);
                      return (
                        <li key={p.id}>
                          <button
                            onClick={() => {
                              setSelected(p.id);
                              void openDirect(p.id);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setSelected(p.id);
                              setMenu({ id: p.id, x: e.clientX, y: e.clientY });
                            }}
                            disabled={dmPending === p.id}
                            aria-label={`Message ${p.display_name}`}
                            className={cn(
                              "flex w-full items-center gap-2 px-2 py-1 text-left disabled:opacity-60",
                              selected === p.id ? "bg-primary/25" : "hover:bg-primary/10",
                            )}
                          >
                            <Avatar
                              name={p.display_name}
                              accent={accentFor(p.id)}
                              avatarPath={p.avatar_url}
                              online={online}
                              size="sm"
                              className="[&>img]:size-9 [&>img]:rounded-sm [&>span]:size-9 [&>span]:rounded-sm [&>span]:text-[11px] [&>span:last-child]:size-2.5 [&>span:last-child]:border"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex min-w-0 items-center gap-1">
                                {countryFlag(p.country) ? (
                                  <span
                                    className="shrink-0 text-sm leading-none"
                                    role="img"
                                    aria-label={`Flag of ${p.country}`}
                                    title={p.country ?? undefined}
                                  >
                                    {countryFlag(p.country)}
                                  </span>
                                ) : null}
                                <span
                                  className={cn(
                                    "truncate text-[13px] font-bold leading-tight",
                                    online ? siteRoleTextClass(role) : "text-muted-foreground",
                                  )}
                                  style={online ? nameColorStyle(role, p.name_color) : undefined}
                                >
                                  {p.display_name}
                                </span>
                                {decorationGlyph(p.decoration) ? (
                                  <span
                                    className="shrink-0 text-sm leading-none"
                                    role="img"
                                    aria-label={decorationLabel(p.decoration) ?? undefined}
                                    title={decorationLabel(p.decoration) ?? undefined}
                                  >
                                    {decorationGlyph(p.decoration)}
                                  </span>
                                ) : null}
                                {siteRoleLabel(role) ? (
                                  <span
                                    className={cn(
                                      "shrink-0 rounded-sm px-1 text-[10px] font-semibold uppercase tracking-wide",
                                      siteRoleBadgeClass(role),
                                    )}
                                  >
                                    {siteRoleLabel(role)}
                                  </span>
                                ) : null}
                                {lockedFor(p) ? (
                                  <Lock
                                    className="size-3 shrink-0 text-muted-foreground/70"
                                    aria-hidden
                                  />
                                ) : null}
                              </span>
                              <span className="flex min-w-0 items-center gap-1 text-[11px] leading-tight text-muted-foreground">
                                <span
                                  aria-hidden
                                  className={cn(
                                    "inline-block size-2 shrink-0 rounded-full",
                                    online ? "bg-online" : "bg-muted-foreground/50",
                                  )}
                                />
                                <span className="truncate">
                                  {dmPending === p.id
                                    ? "Opening chat…"
                                    : online
                                      ? p.status_message || "Online"
                                      : p.status_message || "Offline"}
                                </span>
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            ))}
            {buddyProfiles.length === 0 ? (
              <li className="px-3 py-3 text-xs text-muted-foreground">
                No contacts yet — use Add Friends to build your list.
              </li>
            ) : null}
          </ul>
        )}

        {/* Status bar */}
        <div className="flex items-center justify-between border-t border-border px-2 py-1 text-[11px] text-muted-foreground">
          <span>{me ? "Connected" : "Signing in…"}</span>
          <span>{onlineCount} Online</span>
        </div>
      </div>

      {menu && menuTarget ? (
        <div
          role="menu"
          style={{ top: menu.y, left: menu.x }}
          className="fixed z-50 w-44 rounded-sm border border-border bg-popover py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            role="menuitem"
            onClick={() => {
              setMenu(null);
              void openDirect(menuTarget.id);
            }}
            className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-primary/15"
          >
            Send PM
          </button>
          <Link
            role="menuitem"
            to="/u/$username"
            params={{ username: menuTarget.username }}
            onClick={() => setMenu(null)}
            className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-primary/15"
          >
            View Profile
          </Link>
          <div className="my-1 border-t border-border" />
          {lockedFor(menuTarget) ? (
            <span className="block px-3 py-1.5 text-[13px] text-muted-foreground">
              Delete Friend
            </span>
          ) : (
            <button
              role="menuitem"
              onClick={() => {
                setMenu(null);
                void remove(menuTarget.id, menuTarget.display_name);
              }}
              className="block w-full px-3 py-1.5 text-left text-[13px] text-destructive hover:bg-destructive/10"
            >
              Delete Friend
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
