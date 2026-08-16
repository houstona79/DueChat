import { RatingBadge } from "./RoomRating";
import { RoomCrownMarks } from "@/components/rooms/RoomCrown";
import { useRoomCrowns } from "@/lib/room-crowns";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Mail, NotebookPen, Plus, Settings, Shield, ShieldCheck, Users } from "lucide-react";
import { YahooSearchIcon } from "@/components/icons/YahooIcons";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "./Avatar";
import { BuddyList } from "./BuddyList";
import { NewRoomForm } from "./NewRoomForm";
import { CreditsCard } from "./CreditsCard";
import { NotificationsPanel } from "./NotificationsPanel";
import { RoomInvites } from "./RoomInvites";
import { WaterUpdates } from "./WaterUpdates";
import { ThemeToggle } from "@/components/system/ThemeToggle";
import { ThemeSkinSwatches } from "@/components/system/ThemePicker";
import { WallpaperPicker } from "@/components/system/WallpaperPicker";
import { LanguageSwitcher } from "@/components/system/LanguageSwitcher";
import { AccessibilityButton } from "@/components/system/AccessibilitySettings";
import { supabase } from "@/integrations/supabase/client";
import { useOpenDirect } from "@/hooks/use-direct";
import duechatLogo from "@/assets/duechat-logo.png.asset.json";
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
  ROOM_CATEGORIES,
  type Membership,
  type Profile,
  type Room,
} from "@/lib/chat";
import { cn } from "@/lib/utils";
import { openRoomWindow } from "@/lib/room-window";
import { supportsFloatingRooms, useFloatingRooms } from "@/lib/floating-rooms";

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
  const [category, setCategory] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { open: openDirect, pending: dmPending } = useOpenDirect(me?.id);
  const roomCrowns = useRoomCrowns();

  const profileOf = (id: string) => profiles.find((p) => p.id === id);
  const dmPartner = (room: Room) => {
    const other = me ? counterpartId(room, me.id) : null;
    return other ? profileOf(other) : undefined;
  };
  const roomLabel = (room: Room) =>
    room.is_direct ? (dmPartner(room)?.display_name ?? "Direct message") : room.name;

  const matches = (r: Room) =>
    (roomLabel(r) + (r.topic ?? "")).toLowerCase().includes(query.toLowerCase());
  const myRoomIds = new Set(memberships.filter((m) => m.user_id === me?.id).map((m) => m.room_id));
  const filtered = rooms.filter((r) => !r.is_direct && matches(r));
  const categoryOf = (r: Room) => r.category || "General";
  const usedCategories = [...ROOM_CATEGORIES, "General"].filter(
    (c, i, arr) => arr.indexOf(c) === i && filtered.some((r) => categoryOf(r) === c),
  );
  const extraCategories = [
    ...new Set(filtered.map(categoryOf).filter((c) => !usedCategories.includes(c))),
  ];
  const allCategories = [...usedCategories, ...extraCategories];
  const visible = category ? filtered.filter((r) => categoryOf(r) === category) : filtered;
  const groups = allCategories
    .filter((c) => !category || c === category)
    .map((c) => ({ category: c, rooms: visible.filter((r) => categoryOf(r) === c) }))
    .filter((g) => g.rooms.length > 0);
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

  const floating = useFloatingRooms();
  /**
   * Rooms open as an in-app floating window when there's space for one; small
   * screens and pop-out windows keep plain navigation.
   */
  const openRoom = (roomId: string, kind: "room" | "im", title: string): boolean => {
    if (floating && supportsFloatingRooms()) {
      floating.open(roomId, kind, title);
      return true;
    }
    return openRoomWindow(roomId, kind);
  };

  return (
    <div className="chat-glass flex h-full min-h-0 flex-col bg-sidebar">
      <header className="shrink-0 px-4 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))] short:pb-1.5 short:pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5">
        <div className="app-titlebar -mx-4 -mt-[max(1.25rem,env(safe-area-inset-top))] mb-1 flex items-center justify-between gap-2 px-3 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))] sm:-mx-5 sm:px-4">
          <a href="https://www.duechat.com" aria-label="Go to DueChat" className="inline-block">
            <img
              src={duechatLogo.url}
              alt="DueChat"
              className="h-8 w-auto object-contain short:h-6"
            />
          </a>
          <div className="scroll-rail -mr-1 flex shrink-0 items-center gap-0.5 overflow-x-auto pr-1 sm:gap-1">
            {isAdmin ? (
              <Link
                to="/admin"
                aria-label="Admin panel"
                className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
              >
                <ShieldCheck className="size-6" />
              </Link>
            ) : null}
            {isModerator ? (
              <Link
                to="/moderator"
                aria-label="Moderator panel"
                className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
              >
                <Shield className="size-6" />
              </Link>
            ) : null}
            <Link
              to="/settings"
              aria-label="Profile settings"
              className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
            >
              <Settings className="size-6" />
            </Link>
            <Link
              to="/blogs"
              aria-label="Blogs"
              className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
            >
              <NotebookPen className="size-6" />
            </Link>
            <Link
              to="/mail"
              aria-label="Mailbox"
              className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
            >
              <Mail className="size-6" />
            </Link>
            <ThemeToggle />
            <LanguageSwitcher className="size-9 justify-center rounded-xl border-0 bg-transparent p-0 text-muted-foreground hover:bg-secondary" />
            <AccessibilityButton />
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
            >
              <LogOut className="size-6" />
            </button>
          </div>
        </div>

        {me ? (
          <Link
            to="/settings"
            className="mt-4 flex items-center gap-3 rounded-2xl bg-secondary px-3 py-2.5 hover:bg-accent short:hidden"
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
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
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

        {me ? (
          <button
            onClick={() => setCreating(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground short:mt-2 short:py-2"
          >
            <Plus className="size-6" />
            Create a room
          </button>
        ) : null}
        <ThemeSkinSwatches className="mt-3 rounded-xl bg-secondary px-3 py-2 short:mt-2 short:py-1.5" />
        <WallpaperPicker className="mt-2 rounded-xl bg-secondary px-3 py-2 short:py-1.5" />
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 short:py-1.5">
          <YahooSearchIcon className="size-6" />
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

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <WaterUpdates />
        <CreditsCard meId={me?.id} />
        <NotificationsPanel me={me} profiles={profiles} />
        <RoomInvites me={me} rooms={rooms} profiles={profiles} />
        <BuddyList profiles={profiles} me={me} />
        {directs.length > 0 ? (
          <section className="mb-2">
            <h2 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Direct messages
            </h2>
            <nav aria-label="Direct messages">
              {directs.map((room) => {
                const partner = dmPartner(room);
                return (
                  <Link
                    key={room.id}
                    to="/chat/$roomId"
                    params={{ roomId: room.id }}
                    onClick={(e) => {
                      const title = partner?.display_name ?? "Direct message";
                      if (openRoom(room.id, "im", title)) e.preventDefault();
                    }}
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

        <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-2">
          <button
            onClick={() => setCategory(null)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium",
              category === null
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground",
            )}
          >
            All
          </button>
          {allCategories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c === category ? null : c)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                category === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {groups.map((group) => (
          <section key={group.category}>
            <h2 className="flex items-center justify-between px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>{group.category}</span>
              <span className="font-normal normal-case">{group.rooms.length}</span>
            </h2>
            <nav aria-label={`${group.category} rooms`}>
              {group.rooms.map((room) => {
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
                    onClick={(e) => {
                      if (openRoom(room.id, "room", room.name)) e.preventDefault();
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors sm:py-3",
                      room.id === activeRoomId ? "bg-accent" : "hover:bg-secondary",
                    )}
                  >
                    {room.icon_url ? (
                      <span className="relative inline-flex shrink-0">
                        <img
                          src={room.icon_url}
                          alt={`${room.name} icon`}
                          loading="lazy"
                          className="size-9 rounded-2xl object-cover sm:size-11"
                        />
                        {onlineCount > 0 ? (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-online sm:size-3"
                            aria-hidden
                          />
                        ) : null}
                      </span>
                    ) : (
                      <Avatar
                        name={room.name}
                        accent={accentFor(room.id)}
                        online={onlineCount > 0}
                        className="size-9 sm:size-11"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="truncate text-sm font-semibold"
                            style={room.name_color ? { color: room.name_color } : undefined}
                          >
                            {room.name}
                          </span>
                          <RatingBadge rating={room.rating} />
                          <RoomCrownMarks crowns={roomCrowns.get(room.id) ?? []} />
                          {room.staff_only ? (
                            <span className="shrink-0 rounded-full bg-staff/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-staff">
                              Staff
                            </span>
                          ) : null}
                          {room.locked ? (
                            <span
                              className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground"
                              title="Needs an entry code"
                            >
                              Locked
                            </span>
                          ) : null}
                          {room.invisible ? (
                            <span
                              className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground"
                              title="Hidden from the public room list"
                            >
                              Hidden
                            </span>
                          ) : null}
                        </span>
                        {joined ? null : (
                          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
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
            </nav>
          </section>
        ))}
        <nav aria-label="Room results">
          {visible.length === 0 ? (
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
                              "shrink-0 rounded-full px-1.5 py-px text-[11px] font-semibold uppercase tracking-wide",
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
              <li className="py-2 text-xs text-muted-foreground">
                Nobody else is online right now.
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
