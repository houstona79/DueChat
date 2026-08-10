import { useState } from "react";
import {
  Ban,
  Gift,
  LogOut,
  MessageSquare,
  MicOff,
  Mic,
  ShieldCheck,
  ShieldOff,
  ShieldPlus,
  UserMinus,
  UserX,
  X,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { openProfile } from "./ProfileViewer";
import { countryFlag } from "@/lib/country-flags";
import { decorationGlyph, decorationLabel } from "@/lib/decorations";
import { isBlocked, type Block } from "@/lib/blocks";
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
  expiryFromMinutes,
  formatTime,
  isActive,
  isOnline,
  MODERATION_DURATIONS,
  ROOM_ADMIN_TIER_LABEL,
  type Membership,
  type Profile,
  type RoomAdmin,
  type RoomAdminTier,
  type RoomBan,
  type RoomSilence,
} from "@/lib/chat";
import { cn } from "@/lib/utils";

const actionClass =
  "inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary/70";

function expiryLabel(expiresAt: string | null) {
  if (!expiresAt) return "until removed";
  const mins = Math.round((new Date(expiresAt).getTime() - Date.now()) / 60_000);
  if (mins <= 0) return "expired";
  if (mins < 60) return `${mins} min left`;
  const hours = Math.round(mins / 60);
  return hours < 48 ? `${hours} hr left` : `${Math.round(hours / 24)} days left`;
}

export function MemberList({
  memberships,
  profiles,
  meId,
  ownerId,
  roomAdmins,
  bans,
  silences,
  blocks,
  events,
  canModerate,
  isSuper,
  onClose,
  onMessage,
  onGift,
  onLeave,
  onSetTier,
  onRemoveAdmin,
  onBounce,
  onRestrict,
  onUnrestrict,
  onSilence,
  onUnsilence,
  onBlock,
  onUnblock,
}: {
  memberships: Membership[];
  profiles: Profile[];
  meId: string;
  ownerId?: string | undefined;
  roomAdmins?: RoomAdmin[] | undefined;
  bans?: RoomBan[] | undefined;
  silences?: RoomSilence[] | undefined;
  blocks?: Block[] | undefined;
  events?:
    { id: string; userId: string; action: "join" | "leave" | "bounce"; at: string }[] | undefined;
  canModerate?: boolean | undefined;
  isSuper?: boolean | undefined;
  onClose: () => void;
  onMessage: (userId: string) => void;
  onGift?: ((userId: string) => void) | undefined;
  onLeave?: (() => void) | undefined;
  onSetTier?: ((userId: string, tier: RoomAdminTier) => void) | undefined;
  onRemoveAdmin?: ((userId: string) => void) | undefined;
  onBounce?: ((userId: string) => void) | undefined;
  onRestrict?: ((userId: string, expiresAt: string | null) => void) | undefined;
  onUnrestrict?: ((userId: string) => void) | undefined;
  onSilence?: ((userId: string, expiresAt: string | null) => void) | undefined;
  onUnsilence?: ((userId: string) => void) | undefined;
  onBlock?: ((userId: string) => void) | undefined;
  onUnblock?: ((userId: string) => void) | undefined;
}) {
  const admins = roomAdmins ?? [];
  const tierOf = (id: string): RoomAdminTier | null =>
    id === ownerId ? "super" : (admins.find((a) => a.user_id === id)?.tier ?? null);
  const isListedAdmin = (id: string) => admins.some((a) => a.user_id === id);
  const { data: siteRoles } = useSiteRoles();
  const [durations, setDurations] = useState<Record<string, string>>({});
  const durationOf = (id: string) => durations[id] ?? "1440";

  const members = memberships
    .map((m) => profiles.find((p) => p.id === m.user_id))
    .filter((p): p is Profile => Boolean(p))
    .sort((a, b) => Number(isOnline(b)) - Number(isOnline(a)));

  const silenceOf = (id: string) =>
    (silences ?? []).find((s) => s.user_id === id && isActive(s)) ?? null;

  const banList = (bans ?? [])
    .filter(isActive)
    .map((b) => ({ ban: b, profile: profiles.find((p) => p.id === b.user_id) }))
    .filter((x): x is { ban: RoomBan; profile: Profile } => Boolean(x.profile));

  const silenceList = (silences ?? [])
    .filter(isActive)
    .map((s) => ({ silence: s, profile: profiles.find((p) => p.id === s.user_id) }))
    .filter((x): x is { silence: RoomSilence; profile: Profile } => Boolean(x.profile));

  const roleLabel = (id: string) => {
    if (id === ownerId) return "Owner";
    const tier = tierOf(id);
    return tier ? ROOM_ADMIN_TIER_LABEL[tier] : null;
  };

  const activity = (events ?? []).slice(-20).reverse();
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.display_name ?? "Someone";
  const actionLabel = (action: "join" | "leave" | "bounce") =>
    action === "join" ? "came in" : action === "leave" ? "left" : "was bounced";
  const [tab, setTab] = useState<"members" | "activity">("members");
  const tabClass = (active: boolean) =>
    cn(
      "flex-1 rounded-xl px-3 py-2 text-xs font-semibold",
      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary",
    );

  return (
    <section
      className="flex h-full w-full flex-col border-l border-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:w-[260px] lg:w-[300px]"
      role="region"
      aria-label="Room members"
    >
      <header className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold">Members · {members.length}</h3>
        <button
          onClick={onClose}
          aria-label="Hide members"
          className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </header>
      {events ? (
        <div className="flex gap-1.5 px-3 pb-2" role="tablist" aria-label="Members panel views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "members"}
            onClick={() => setTab("members")}
            className={tabClass(tab === "members")}
          >
            In the room
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "activity"}
            onClick={() => setTab("activity")}
            className={tabClass(tab === "activity")}
          >
            Coming &amp; going
          </button>
        </div>
      ) : null}
      <ul
        className={cn("min-h-0 flex-1 overflow-y-auto px-2 pb-4", tab === "activity" && "hidden")}
      >
        {members.map((p) => {
          const role = roleLabel(p.id);
          const siteRole = siteRoleOf(siteRoles, p.id);
          const isTargetProtected = p.id === ownerId || p.id === meId;
          const canActOn = Boolean(canModerate) && !isTargetProtected;
          const silenced = silenceOf(p.id);
          const blocked = isBlocked(blocks, p.id);
          const glyph = decorationGlyph(p.decoration);
          return (
            <li key={p.id} className="rounded-2xl px-2 py-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openProfile(p.id)}
                  aria-label={`View ${p.display_name}'s profile`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left hover:opacity-80"
                >
                  <Avatar
                    name={p.display_name}
                    accent={accentFor(p.id)}
                    avatarPath={p.avatar_url}
                    online={isOnline(p)}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
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
                        className={cn("truncate text-sm font-medium", siteRoleTextClass(siteRole))}
                        style={nameColorStyle(siteRole, p.name_color)}
                      >
                        {p.display_name}
                        {p.id === meId ? " (you)" : ""}
                      </span>
                      {glyph ? (
                        <span
                          className="shrink-0 text-sm leading-none"
                          role="img"
                          aria-label={decorationLabel(p.decoration) ?? undefined}
                          title={decorationLabel(p.decoration) ?? undefined}
                        >
                          {glyph}
                        </span>
                      ) : null}
                      {siteRoleLabel(siteRole) ? (
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                            siteRoleBadgeClass(siteRole),
                          )}
                        >
                          {siteRoleLabel(siteRole)}
                        </span>
                      ) : null}
                      {role ? (
                        <span className="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                          {role}
                        </span>
                      ) : null}
                      {silenced ? (
                        <span className="shrink-0 rounded-md bg-destructive/15 px-1.5 py-0.5 text-[11px] font-semibold text-destructive">
                          Silenced
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
                </button>
                {p.id === meId ? null : (
                  <>
                    {onGift ? (
                      <button
                        onClick={() => onGift(p.id)}
                        aria-label={`Send a gift to ${p.display_name}`}
                        title="Send a gift"
                        className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground hover:bg-primary/15 hover:text-primary"
                      >
                        <Gift className="size-4" />
                      </button>
                    ) : null}
                  <button
                    onClick={() => onMessage(p.id)}
                    aria-label={`Message ${p.display_name}`}
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary hover:bg-primary/25"
                  >
                    <MessageSquare className="size-4" />
                  </button>
                  </>
                )}
              </div>

              {p.bio || p.website_url ? (
                <div className="mt-1 space-y-1 pl-11">
                  {p.bio ? (
                    <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                      {p.bio}
                    </p>
                  ) : null}
                  {p.website_url ? (
                    <a
                      href={p.website_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                      className="block truncate text-xs text-primary hover:underline"
                    >
                      {p.website_url.replace(/^https?:\/\//, "")}
                    </a>
                  ) : null}
                </div>
              ) : null}

              {p.id !== meId && (onBlock || onUnblock) ? (
                <div className="mt-1.5 pl-11">
                  {blocked ? (
                    <button onClick={() => onUnblock?.(p.id)} className={actionClass}>
                      <UserX className="size-3" />
                      Unblock
                    </button>
                  ) : (
                    <button onClick={() => onBlock?.(p.id)} className={actionClass}>
                      <UserX className="size-3" />
                      Block
                    </button>
                  )}
                </div>
              ) : null}

              {canActOn ? (
                <div className="mt-1.5 space-y-1.5 pl-11">
                  {isSuper && onSetTier && onRemoveAdmin ? (
                    <div className="flex flex-wrap gap-1.5">
                      {isListedAdmin(p.id) ? (
                        <>
                          {tierOf(p.id) === "super" ? (
                            <button
                              onClick={() => onSetTier(p.id, "admin")}
                              className={actionClass}
                            >
                              <ShieldCheck className="size-3" />
                              Make room admin
                            </button>
                          ) : (
                            <button
                              onClick={() => onSetTier(p.id, "super")}
                              className={actionClass}
                            >
                              <ShieldPlus className="size-3" />
                              Make super admin
                            </button>
                          )}
                          <button onClick={() => onRemoveAdmin(p.id)} className={actionClass}>
                            <ShieldOff className="size-3" />
                            Remove admin
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => onSetTier(p.id, "admin")} className={actionClass}>
                            <ShieldCheck className="size-3" />
                            Make room admin
                          </button>
                          <button onClick={() => onSetTier(p.id, "super")} className={actionClass}>
                            <ShieldPlus className="size-3" />
                            Make super admin
                          </button>
                        </>
                      )}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-1.5">
                    <label className="sr-only" htmlFor={`dur-${p.id}`}>
                      Length for {p.display_name}
                    </label>
                    <select
                      id={`dur-${p.id}`}
                      value={durationOf(p.id)}
                      onChange={(e) =>
                        setDurations((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      className="shrink-0 rounded-lg bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground outline-none"
                    >
                      {MODERATION_DURATIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    {silenced
                      ? onUnsilence && (
                          <button onClick={() => onUnsilence(p.id)} className={actionClass}>
                            <Mic className="size-3" />
                            Let them type
                          </button>
                        )
                      : onSilence && (
                          <button
                            onClick={() =>
                              onSilence(p.id, expiryFromMinutes(Number(durationOf(p.id))))
                            }
                            className={actionClass}
                          >
                            <MicOff className="size-3" />
                            Silence
                          </button>
                        )}
                    {onBounce ? (
                      <button onClick={() => onBounce(p.id)} className={actionClass}>
                        <UserMinus className="size-3" />
                        Bounce
                      </button>
                    ) : null}
                    {onRestrict ? (
                      <button
                        onClick={() =>
                          onRestrict(p.id, expiryFromMinutes(Number(durationOf(p.id))))
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-destructive/15 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/25"
                      >
                        <Ban className="size-3" />
                        Restrict
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
        {members.length === 0 ? (
          <li className="px-3 py-6 text-center text-xs text-muted-foreground">No members yet.</li>
        ) : null}

        {canModerate && silenceList.length > 0 ? (
          <li className="mt-3 border-t border-border px-2 pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Silenced · {silenceList.length}
            </p>
            <ul className="space-y-1.5">
              {silenceList.map(({ silence, profile }) => (
                <li key={silence.user_id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {profile.display_name} · {expiryLabel(silence.expires_at)}
                  </span>
                  {onUnsilence ? (
                    <button onClick={() => onUnsilence(silence.user_id)} className={actionClass}>
                      Un-silence
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ) : null}

        {canModerate && banList.length > 0 ? (
          <li className="mt-3 border-t border-border px-2 pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Restricted · {banList.length}
            </p>
            <ul className="space-y-1.5">
              {banList.map(({ ban, profile }) => (
                <li key={ban.user_id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {profile.display_name} · {expiryLabel(ban.expires_at)}
                    {ban.reason ? ` · ${ban.reason}` : ""}
                  </span>
                  {onUnrestrict ? (
                    <button onClick={() => onUnrestrict(ban.user_id)} className={actionClass}>
                      Remove
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ) : null}
      </ul>
      {events && tab === "activity" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {activity.length === 0 ? (
            <p className="text-xs text-muted-foreground">No arrivals or exits yet.</p>
          ) : (
            <ul className="space-y-1.5" aria-live="polite">
              {activity.map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      e.action === "join" ? "bg-primary" : "bg-muted-foreground/60",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    <span className="font-medium text-foreground">{nameOf(e.userId)}</span>{" "}
                    {actionLabel(e.action)}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatTime(e.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
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
    </section>
  );
}
