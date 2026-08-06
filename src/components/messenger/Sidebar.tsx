import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Plus, Search, Settings, Shield, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "./Avatar";
import { BuddyList } from "./BuddyList";
import { NewRoomForm } from "./NewRoomForm";
import { WaterUpdates } from "./WaterUpdates";
import { supabase } from "@/integrations/supabase/client";
import { useOpenDirect } from "@/hooks/use-direct";
import {
  siteRoleBadgeClass,
  siteRoleLabel,
  siteRoleOf,
  siteRoleTextClass,
  nameColorStyle,
  useSiteRoles,
} from "@/hooks/use-roles";
import {
  accentFor,
  counterpartId,
  isOnline,
  type Membership,
  type Profile,
  type Room,
} from "@/lib/chat";
import { cn } from "@/lib/utils";

export function Sidebar({
  rooms,
  memberships,
  profiles,
  me,
  activeRoomId,
}: {
  rooms: Room[];
  memberships: Membership[];
  profiles: Profile[];
  me: Profile | null | undefined;
  activeRoomId?: string | undefined;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { open: openDirect, pending: dmPending } = useOpenDirect(me?.id);

  const profileOf = (id: string) => profiles.find((p) => p.id === id);
  const dmPartner = (room: Room) => {
    const other = me ? counterpartId(room, me.id) : null;
    return other ? profileOf(other) : undefined;
  };
  const roomLabel = (room: Room) =>
    room.is_direct ? (dmPartner(room)?.display_name ?? "Direct message") : room.name;

  const matches = (r: Room) =>
    (roomLabel(r) + (r.topic ?? "")).toLowerCase().includes(query.toLowerCase());
  const myRoomIds = new Set(
    memberships.filter((m) => m.user_id === me?.id).map((m) => m.room_id),
  );
  const filtered = rooms.filter((r) => !r.is_direct && matches(r));
  const directs = rooms.filter((r) => r.is_direct && myRoomIds.has(r.id) && matches(r));
  const onlineOthers = profiles.filter((p) => isOnline(p) && p.id !== me?.id);

  const { data: roles } = useSiteRoles(!!me?.id);
  const myRole = me ? siteRoleOf(roles, me.id) : null;
  const isAdmin = myRole === "admin";
  const isModerator = myRole === "moderator";

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <header className="px-5 pb-3 pt-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Rooms</h1>
          <div className="flex items-center gap-1">
            {isAdmin ? (
              <Link
                to="/admin"
                aria-label="Admin panel"
                className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
              >
                <ShieldCheck className="size-4" />
              </Link>
            ) : null}
            {isModerator ? (
              <Link
                to="/moderator"
                aria-label="Moderator panel"
                className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
              >
                <Shield className="size-4" />
              </Link>
            ) : null}
            <Link
              to="/settings"
              aria-label="Profile settings"
              className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
            >
              <Settings className="size-4" />
            </Link>
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
            >
              <LogOut className="size-4" />
            </button>
            <button
              onClick={() => setCreating((v) => !v)}
              aria-label="Create chat room"
              className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {me ? (
          <Link
            to="/settings"
            className="mt-4 flex items-center gap-3 rounded-2xl bg-secondary px-3 py-2.5 hover:bg-accent"
          >
            <Avatar
              name={me.display_name}
              accent={accentFor(me.id)}
              avatarPath={me.avatar_url}
              online
              size="sm"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span
                  className={cn("truncate text-sm font-semibold", siteRoleTextClass(myRole))}
                  style={nameColorStyle(myRole, me.name_color)}
                >
                  {me.display_name}
                </span>
                {siteRoleLabel(myRole) ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                      siteRoleBadgeClass(myRole),
                    )}
                  >
                    {siteRoleLabel(myRole)}
                  </span>
                ) : null}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {me.status_message || `@${me.username}`}
              </span>
            </span>
          </Link>
        ) : null}

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms"
            aria-label="Search rooms"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        {creating && me ? <NewRoomForm userId={me.id} onDone={() => setCreating(false)} /> : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6">
        <WaterUpdates />
        <BuddyList profiles={profiles} me={me} />
        {directs.length > 0 ? (
          <section className="mb-2">
            <h2 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Direct messages
            </h2>
            <nav>
              {directs.map((room) => {
                const partner = dmPartner(room);
                return (
                  <Link
                    key={room.id}
                    to="/chat/$roomId"
                    params={{ roomId: room.id }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors",
                      room.id === activeRoomId ? "bg-accent" : "hover:bg-secondary",
                    )}
                  >
                    <Avatar
                      name={partner?.display_name ?? "Direct message"}
                      accent={accentFor(partner?.id ?? room.id)}
                      avatarPath={partner?.avatar_url ?? null}
                      online={partner ? isOnline(partner) : false}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {partner?.display_name ?? "Direct message"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {partner ? `@${partner.username}` : "Private chat"}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ) : null}

        <h2 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Rooms
        </h2>
        <nav>
          {filtered.map((room) => {
            const members = memberships.filter((m) => m.room_id === room.id);
            const joined = members.some((m) => m.user_id === me?.id);
            const onlineCount = members.filter((m) =>
              profiles.some((p) => p.id === m.user_id && isOnline(p)),
            ).length;
            return (
              <Link
                key={room.id}
                to="/chat/$roomId"
                params={{ roomId: room.id }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors",
                  room.id === activeRoomId ? "bg-accent" : "hover:bg-secondary",
                )}
              >
                <Avatar name={room.name} accent={accentFor(room.id)} online={onlineCount > 0} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{room.name}</span>
                    {joined ? null : (
                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Join
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Users className="size-3" aria-hidden />
                    {members.length} {members.length === 1 ? "member" : "members"}
                    {onlineCount > 0 ? ` · ${onlineCount} online` : ""}
                  </span>
                </span>
              </Link>
            );
          })}
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {rooms.length === 0 ? "No rooms yet — create the first one." : "No matches."}
            </p>
          ) : null}
        </nav>

        <section className="mt-4 px-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Online now · {onlineOthers.length}
          </h2>
          <ul className="mt-2 space-y-1">
            {onlineOthers.map((p) => {
              const pRole = siteRoleOf(roles, p.id);
              return (
              <li key={p.id}>
                <button
                  onClick={() => void openDirect(p.id)}
                  disabled={dmPending === p.id}
                  aria-label={`Message ${p.display_name}`}
                  className="flex w-full items-center gap-3 rounded-2xl px-1 py-1.5 text-left hover:bg-secondary disabled:opacity-60"
                >
                  <Avatar
                    name={p.display_name}
                    accent={accentFor(p.id)}
                    avatarPath={p.avatar_url}
                    online
                    size="sm"
                  />
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={cn("truncate text-sm", siteRoleTextClass(pRole))}
                        style={nameColorStyle(pRole, p.name_color)}
                      >
                        {p.display_name}
                      </span>
                      {siteRoleLabel(pRole) ? (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide",
                            siteRoleBadgeClass(pRole),
                          )}
                        >
                          {siteRoleLabel(pRole)}
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {dmPending === p.id
                        ? "Opening chat…"
                        : p.status_message || `@${p.username}`}
                    </span>
                  </span>
                </button>
              </li>
              );
            })}
            {onlineOthers.length === 0 ? (
              <li className="py-2 text-xs text-muted-foreground">Nobody else is online right now.</li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
