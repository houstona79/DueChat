import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Lock, MessageCircle, UserMinus, UserPlus, X } from "lucide-react";
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
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);

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
    { key: "online", label: "Online", people: buddyProfiles.filter(isOnline) },
    { key: "offline", label: "Offline", people: buddyProfiles.filter((p) => !isOnline(p)) },
  ];

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return profiles
      .filter((p) => p.id !== me?.id && !buddyIds.has(p.id))
      .filter((p) => (term ? (p.display_name + p.username).toLowerCase().includes(term) : true))
      .slice(0, 8);
  }, [profiles, buddyIds, me?.id, search]);

  const add = async (id: string, name: string) => {
    if (!me) return;
    try {
      await addBuddy(me.id, id);
      await queryClient.invalidateQueries({ queryKey: ["buddies"] });
      toast.success(`${name} added to your buddy list`);
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

  return (
    <section className="mb-2 w-full">
      <div className="flex items-center gap-1.5 px-3 pb-1 pt-2">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="size-4" aria-hidden />
          ) : (
            <ChevronDown className="size-4" aria-hidden />
          )}
          Buddies · {onlineCount}/{buddyProfiles.length}
        </button>
        <button
          onClick={() => setAdding((v) => !v)}
          aria-label={adding ? "Close buddy search" : "Add a buddy"}
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          {adding ? <X className="size-4" /> : <UserPlus className="size-4" />}
        </button>
      </div>

      {adding ? (
        <div className="mx-3 mb-2 rounded-lg border border-border bg-card p-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find people by name"
            aria-label="Find people to add"
            className="w-full rounded-md bg-secondary px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <ul className="mt-1">
            {candidates.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => void add(p.id, p.display_name)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-secondary"
                >
                  <Avatar
                    name={p.display_name}
                    accent={accentFor(p.id)}
                    avatarPath={p.avatar_url}
                    online={isOnline(p)}
                    size="sm"
                    className="[&>img]:size-7 [&>img]:rounded-md [&>span]:size-7 [&>span]:rounded-md [&>span]:text-[10px]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm leading-tight">{p.display_name}</span>
                    <span className="block truncate text-xs leading-tight text-muted-foreground">
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
      ) : null}

      {!collapsed ? (
        <ul>
          {groups.flatMap((g) => [
            g.people.length > 0 ? (
              <li
                key={g.key}
                className="px-3 pb-px pt-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {g.label} · {g.people.length}
              </li>
            ) : null,
            ...g.people.map((p) => {
              const role = siteRoleOf(roles, p.id);
              const online = isOnline(p);
              return (
                <li key={p.id} className="group flex items-center gap-1 pr-2">
                  <button
                    onClick={() => void openDirect(p.id)}
                    disabled={dmPending === p.id}
                    aria-label={`Message ${p.display_name}`}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-secondary disabled:opacity-60"
                  >
                    <Avatar
                      name={p.display_name}
                      accent={accentFor(p.id)}
                      avatarPath={p.avatar_url}
                      online={online}
                      size="sm"
                      className="[&>img]:size-7 [&>img]:rounded-[5px] [&>span]:size-7 [&>span]:rounded-[5px] [&>span]:text-[10px] [&>span:last-child]:size-2.5 [&>span:last-child]:border"
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
                            "truncate text-sm font-medium leading-tight",
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
                              "shrink-0 rounded-full px-1.5 text-[10px] font-semibold uppercase tracking-wide",
                              siteRoleBadgeClass(role),
                            )}
                          >
                            {siteRoleLabel(role)}
                          </span>
                        ) : null}
                      </span>
                      {dmPending === p.id ? (
                        <span className="block truncate text-xs leading-tight text-muted-foreground">
                          Opening chat…
                        </span>
                      ) : p.status_message ? (
                        <span className="block truncate text-xs leading-tight text-muted-foreground">
                          {p.status_message}
                        </span>
                      ) : null}
                    </span>
                    <MessageCircle
                      className="size-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"
                      aria-hidden
                    />
                  </button>
                  {lockedFor(p) ? (
                    <span
                      className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground/60"
                      title="Staff buddy link — stays while the role is held"
                      aria-label={`${p.display_name} is a locked staff buddy`}
                    >
                      <Lock className="size-4" aria-hidden />
                    </span>
                  ) : (
                    <button
                      onClick={() => void remove(p.id, p.display_name)}
                      aria-label={`Remove ${p.display_name} from buddies`}
                      className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 hover:bg-secondary hover:text-destructive group-hover:opacity-100"
                    >
                      <UserMinus className="size-4" />
                    </button>
                  )}
                </li>
              );
            }),
          ])}
          {buddyProfiles.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              No buddies yet — tap the add icon to build your list.
            </li>
          ) : null}
        </ul>
      ) : null}
    </section>
  );
}
