import { Ban, LogOut, MessageSquare, ShieldCheck, ShieldOff, UserMinus, X } from "lucide-react";
import { Avatar } from "./Avatar";
import {
  siteRoleBadgeClass,
  siteRoleLabel,
  siteRoleOf,
  siteRoleTextClass,
  nameColorStyle,
  useSiteRoles,
} from "@/hooks/use-roles";
import { accentFor, isOnline, type Membership, type Profile, type RoomBan } from "@/lib/chat";
import { cn } from "@/lib/utils";

export function MemberList({
  memberships,
  profiles,
  meId,
  ownerId,
  roomAdminIds,
  bans,
  canModerate,
  isOwner,
  onClose,
  onMessage,
  onLeave,
  onPromote,
  onDemote,
  onKick,
  onBan,
  onUnban,
}: {
  memberships: Membership[];
  profiles: Profile[];
  meId: string;
  ownerId?: string | undefined;
  roomAdminIds?: string[] | undefined;
  bans?: RoomBan[] | undefined;
  canModerate?: boolean | undefined;
  isOwner?: boolean | undefined;
  onClose: () => void;
  onMessage: (userId: string) => void;
  onLeave?: (() => void) | undefined;
  onPromote?: ((userId: string) => void) | undefined;
  onDemote?: ((userId: string) => void) | undefined;
  onKick?: ((userId: string) => void) | undefined;
  onBan?: ((userId: string) => void) | undefined;
  onUnban?: ((userId: string) => void) | undefined;
}) {
  const adminIds = new Set(roomAdminIds ?? []);
  const { data: siteRoles } = useSiteRoles();
  const members = memberships
    .map((m) => profiles.find((p) => p.id === m.user_id))
    .filter((p): p is Profile => Boolean(p))
    .sort((a, b) => Number(isOnline(b)) - Number(isOnline(a)));

  const banList = (bans ?? [])
    .map((b) => ({ ban: b, profile: profiles.find((p) => p.id === b.user_id) }))
    .filter((x): x is { ban: RoomBan; profile: Profile } => Boolean(x.profile));

  const roleLabel = (id: string) =>
    id === ownerId ? "Owner" : adminIds.has(id) ? "Room admin" : null;

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[85%] flex-col border-l border-border bg-sidebar pb-[env(safe-area-inset-bottom)] shadow-xl sm:max-w-xs">
      <header className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h3 className="text-sm font-semibold">Members · {members.length}</h3>
        <button
          onClick={onClose}
          aria-label="Close members"
          className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </header>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {members.map((p) => {
          const role = roleLabel(p.id);
          const siteRole = siteRoleOf(siteRoles, p.id);
          const isTargetProtected = p.id === ownerId || p.id === meId;
          const canActOn = Boolean(canModerate) && !isTargetProtected;
          return (
            <li key={p.id} className="rounded-2xl px-2 py-2">
              <div className="flex items-center gap-3">
                <Avatar
                  name={p.display_name}
                  accent={accentFor(p.id)}
                  avatarPath={p.avatar_url}
                  online={isOnline(p)}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn("truncate text-sm font-medium", siteRoleTextClass(siteRole))}
                      style={nameColorStyle(siteRole, p.name_color)}
                    >
                      {p.display_name}
                      {p.id === meId ? " (you)" : ""}
                    </span>
                    {siteRoleLabel(siteRole) ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                          siteRoleBadgeClass(siteRole),
                        )}
                      >
                        {siteRoleLabel(siteRole)}
                      </span>
                    ) : null}
                    {role ? (
                      <span className="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {role}
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    <span className={isOnline(p) ? "text-primary" : undefined}>
                      {isOnline(p) ? "Online" : "Offline"}
                    </span>
                    {" · "}
                    {p.status_message || `@${p.username}`}
                  </span>
                </span>
                {p.id === meId ? null : (
                  <button
                    onClick={() => onMessage(p.id)}
                    aria-label={`Message ${p.display_name}`}
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary hover:bg-primary/25"
                  >
                    <MessageSquare className="size-4" />
                  </button>
                )}
              </div>

              {canActOn ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5 pl-11">
                  {isOwner && onPromote && onDemote ? (
                    adminIds.has(p.id) ? (
                      <button
                        onClick={() => onDemote(p.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary/70"
                      >
                        <ShieldOff className="size-3" />
                        Remove admin
                      </button>
                    ) : (
                      <button
                        onClick={() => onPromote(p.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary/70"
                      >
                        <ShieldCheck className="size-3" />
                        Make admin
                      </button>
                    )
                  ) : null}
                  {onKick ? (
                    <button
                      onClick={() => onKick(p.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary/70"
                    >
                      <UserMinus className="size-3" />
                      Kick
                    </button>
                  ) : null}
                  {onBan ? (
                    <button
                      onClick={() => onBan(p.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-destructive/15 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/25"
                    >
                      <Ban className="size-3" />
                      Ban
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
        {members.length === 0 ? (
          <li className="px-3 py-6 text-center text-xs text-muted-foreground">No members yet.</li>
        ) : null}

        {canModerate && banList.length > 0 ? (
          <li className="mt-3 border-t border-border px-2 pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Banned · {banList.length}
            </p>
            <ul className="space-y-1.5">
              {banList.map(({ ban, profile }) => (
                <li key={ban.user_id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {profile.display_name}
                    {ban.reason ? ` · ${ban.reason}` : ""}
                  </span>
                  {onUnban ? (
                    <button
                      onClick={() => onUnban(ban.user_id)}
                      className="shrink-0 rounded-lg bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary/70"
                    >
                      Unban
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ) : null}
      </ul>
      {onLeave ? (
        <div className="border-t border-border p-3">
          <button
            onClick={onLeave}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/15 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/25"
          >
            <LogOut className="size-4" />
            Leave room
          </button>
        </div>
      ) : null}
    </aside>
  );
}
