import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Globe, MapPin, MessageSquare, User } from "lucide-react";
import { genderLabel } from "@/lib/genders";
import { Avatar } from "@/components/messenger/Avatar";
import { ProfilePhotos } from "@/components/messenger/ProfilePhotos";
import { ProfileFeed } from "@/components/messenger/ProfileFeed";
import { SocialStatus } from "@/components/messenger/SocialStatus";
import { useAuth } from "@/hooks/use-auth";
import { useBuddies, useProfiles } from "@/hooks/use-chat";
import { visibleGender, visiblePronouns } from "@/lib/field-visibility";
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

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: () => ({
    meta: [
      { title: "Member profile — DueChat" },
      { name: "description", content: "View a DueChat member profile, status and rooms." },
      { property: "og:title", content: "Member profile — DueChat" },
      {
        property: "og:description",
        content: "View a DueChat member profile, status and rooms.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const { data: profiles = [], isLoading } = useProfiles();
  const { data: myBuddies = [] } = useBuddies(user?.id);
  const { data: roles } = useSiteRoles();
  const { open: openDirect, pending } = useOpenDirect(user?.id);

  const handle = username.toLowerCase();
  const profile = profiles.find((p) => p.username?.toLowerCase() === handle);
  const role = profile ? siteRoleOf(roles, profile.id) : null;
  const online = profile ? isOnline(profile) : false;
  const isMe = !!profile && user?.id === profile.id;

  return (
    <main id="main-content" className="mx-auto w-full max-w-xl px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <Link
        to="/chat"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to DueChat
      </Link>

      {isLoading && !profile ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading profile…</p>
      ) : !profile ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No member found with the handle @{username}.
        </p>
      ) : (
        <div className="mt-6 rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <Avatar
              name={profile.display_name ?? "Unknown"}
              accent={accentFor(profile.id)}
              avatarPath={profile.avatar_url ?? null}
              online={online}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1
                  className={cn("truncate text-xl font-semibold", siteRoleTextClass(role))}
                  style={nameColorStyle(role, profile.name_color ?? null)}
                >
                  {profile.display_name ?? "Unknown member"}
                </h1>
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
              <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
              <p className={cn("text-xs", online ? "text-primary" : "text-muted-foreground")}>
                {online ? "Online now" : "Offline"}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <SocialStatus profile={profile} />
            {profile.bio ? (
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
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
            <ProfileFeed userId={profile.id} />
          </div>

          {!isMe ? (
            <button
              onClick={() => void openDirect(profile.id)}
              disabled={pending === profile.id}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <MessageSquare className="size-4" />
              Message
            </button>
          ) : (
            <Link
              to="/settings"
              className="mt-6 flex w-full items-center justify-center rounded-2xl bg-secondary px-4 py-2.5 text-sm font-semibold"
            >
              Edit your profile
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
