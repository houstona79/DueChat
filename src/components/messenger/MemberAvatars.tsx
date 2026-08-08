import { Avatar } from "./Avatar";
import { openProfile } from "./ProfileViewer";
import type { Membership, Profile } from "@/lib/chat";
import { accentFor, isOnline } from "@/lib/chat";

/** Row of profile icons showing who is in the room (online first). */
export function MemberAvatars({
  members,
  profiles,
  max = 8,
  onShowAll,
}: {
  members: Membership[];
  profiles: Profile[];
  max?: number;
  onShowAll?: () => void;
}) {
  const people = members
    .map((m) => ({ id: m.user_id, profile: profiles.find((p) => p.id === m.user_id) }))
    .sort((a, b) => {
      const ao = a.profile && isOnline(a.profile) ? 0 : 1;
      const bo = b.profile && isOnline(b.profile) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return (a.profile?.display_name ?? "").localeCompare(b.profile?.display_name ?? "");
    });

  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;

  return (
    <ul
      aria-label={`${people.length} in this room`}
      className="flex min-w-0 flex-wrap items-center gap-1"
    >
      {shown.map((p) => {
        const name = p.profile?.display_name ?? "Member";
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => openProfile(p.id)}
              title={p.profile ? `${name} (@${p.profile.username})` : name}
              aria-label={`View ${name}'s profile`}
              className="rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Avatar
                name={name}
                accent={accentFor(p.id)}
                avatarPath={p.profile?.avatar_url ?? null}
                online={p.profile ? isOnline(p.profile) : false}
                size="sm"
              />
            </button>
          </li>
        );
      })}
      {rest > 0 ? (
        <li>
          <button
            type="button"
            onClick={onShowAll}
            className="grid size-9 place-items-center rounded-2xl bg-secondary text-xs font-semibold text-muted-foreground hover:bg-secondary/80"
            aria-label={`Show all ${people.length} members`}
          >
            +{rest}
          </button>
        </li>
      ) : null}
    </ul>
  );
}