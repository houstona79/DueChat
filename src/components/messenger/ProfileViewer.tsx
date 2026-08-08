import { useEffect, useState, useSyncExternalStore } from "react";
import { BadgeCheck, ExternalLink, Globe, MapPin, MessageSquare, User, X } from "lucide-react";
import { genderLabel } from "@/lib/genders";
import { visibleGender, visiblePronouns } from "@/lib/field-visibility";
import { useBuddies } from "@/hooks/use-chat";
import { Link } from "@tanstack/react-router";
import { Avatar } from "./Avatar";
import { ProfilePhotos } from "./ProfilePhotos";
import { ProfileFeed } from "./ProfileFeed";
import { SocialStatus } from "./SocialStatus";
import { YearBadges } from "./YearBadges";
import { useAuth } from "@/hooks/use-auth";
import { useProfiles } from "@/hooks/use-chat";
import { useOpenDirect } from "@/hooks/use-direct";
import {
  nameColorStyle,
  siteRoleBadgeClass,
  siteRoleLabel,
  siteRoleOf,
  siteRoleTextClass,
  useSiteRoles,
} from "@/hooks/use-roles";
import { accentFor, isAdultProfile, isOnline } from "@/lib/chat";
import { cn } from "@/lib/utils";

/** Tiny global store so any list can open a profile card. */
let currentId: string | null = null;
let currentHighlight: string | null = null;
const listeners = new Set<() => void>();

export function openProfile(userId: string, highlightUpdateId?: string) {
  currentId = userId;
  currentHighlight = highlightUpdateId ?? null;
  listeners.forEach((l) => l());
}

export function closeProfile() {
  currentId = null;
  currentHighlight = null;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useOpenProfileId() {
  return useSyncExternalStore(
    subscribe,
    () => currentId,
    () => null,
  );
}

function useHighlightUpdateId() {
  return useSyncExternalStore(
    subscribe,
    () => currentHighlight,
    () => null,
  );
}

export function ProfileViewer() {
  const userId = useOpenProfileId();
  const highlightUpdateId = useHighlightUpdateId();
  const { user } = useAuth();
  const { data: profiles = [], isLoading: profilesLoading } = useProfiles();
  const { data: myBuddies = [] } = useBuddies(user?.id);
  const { data: roles } = useSiteRoles();
  const { open: openDirect, pending } = useOpenDirect(user?.id);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!userId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeProfile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [userId]);

  if (!mounted || !userId) return null;
  const profile = profiles.find((p) => p.id === userId);
  const role = siteRoleOf(roles, userId);
  const online = profile ? isOnline(profile) : false;
  const isMe = user?.id === userId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Profile"
      onClick={closeProfile}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:max-w-xl sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 p-5 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              name={profile?.display_name ?? "Unknown"}
              accent={accentFor(userId)}
              avatarPath={profile?.avatar_url ?? null}
              online={online}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2
                  className={cn("truncate text-lg font-semibold", siteRoleTextClass(role))}
                  style={nameColorStyle(role, profile?.name_color ?? null)}
                >
                  {profile?.display_name ?? "Unknown member"}
                </h2>
                {siteRoleLabel(role) ? (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                      siteRoleBadgeClass(role),
                    )}
                  >
                    {siteRoleLabel(role)}
                  </span>
                ) : null}
              </div>
              {profile ? (
                <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
              ) : null}
              <p className={cn("text-xs", online ? "text-primary" : "text-muted-foreground")}>
                {online ? "Online now" : "Offline"}
              </p>
            </div>
          </div>
          <button
            onClick={closeProfile}
            aria-label="Close profile"
            className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
          {profile ? (
            <div className="space-y-3 text-sm">
              <YearBadges profile={profile} />
              <SocialStatus profile={profile} />
              {profile.bio ? (
                <p className="whitespace-pre-line break-words leading-relaxed text-muted-foreground">
                  {profile.bio}
                </p>
              ) : null}
              {profile.country ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  {profile.country}
                </p>
              ) : null}
              {genderLabel(visibleGender(profile, user?.id, myBuddies)) ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="size-3.5 shrink-0" aria-hidden />
                  {genderLabel(visibleGender(profile, user?.id, myBuddies))}
                </p>
              ) : null}
              {visiblePronouns(profile, user?.id, myBuddies) ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BadgeCheck className="size-3.5 shrink-0" aria-hidden />
                  {visiblePronouns(profile, user?.id, myBuddies)}
                </p>
              ) : null}
              {profile.website_url ? (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  className="flex items-center gap-2 text-xs text-primary hover:underline"
                >
                  <Globe className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{profile.website_url.replace(/^https?:\/\//, "")}</span>
                </a>
              ) : null}
              {isAdultProfile(profile) ? (
                <p className="text-xs text-muted-foreground">Verified 18+</p>
              ) : null}
              <ProfilePhotos userId={profile.id} />
              <ProfileFeed userId={profile.id} highlightUpdateId={highlightUpdateId} />
            </div>
          ) : profilesLoading ? (
            <p className="text-sm text-muted-foreground">Loading profile…</p>
          ) : (
            <p className="text-sm text-muted-foreground">This profile isn’t available.</p>
          )}
        </div>

        {profile ? (
          <div className="flex shrink-0 flex-col gap-2 border-t border-border p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5">
            {!isMe ? (
              <button
                onClick={() => {
                  closeProfile();
                  void openDirect(profile.id);
                }}
                disabled={pending === profile.id}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                <MessageSquare className="size-4" />
                Message
              </button>
            ) : null}
            <Link
              to="/u/$username"
              params={{ username: profile.username }}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeProfile}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-sm font-semibold hover:opacity-90"
            >
              <ExternalLink className="size-4" />
              Open profile in new tab
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
