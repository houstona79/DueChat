import type { Buddy, Profile } from "@/lib/chat";

export const FIELD_VISIBILITIES = [
  { value: "public", label: "Everyone" },
  { value: "buddies", label: "Buddies only" },
] as const;

export type FieldVisibility = (typeof FIELD_VISIBILITIES)[number]["value"];

/**
 * Can `viewerId` see a visibility-gated profile field?
 * Own profile always visible; "buddies" requires the profile owner on the viewer's buddy list.
 */
export function canSeeField(
  visibility: string | null | undefined,
  profileId: string,
  viewerId: string | undefined,
  viewerBuddies: Buddy[] | undefined,
) {
  if (viewerId && viewerId === profileId) return true;
  if (visibility !== "buddies") return true;
  if (!viewerId) return false;
  return (viewerBuddies ?? []).some((b) => b.buddy_id === profileId);
}

export function visibleGender(
  profile: Pick<Profile, "id" | "gender" | "gender_visibility">,
  viewerId: string | undefined,
  viewerBuddies: Buddy[] | undefined,
) {
  return canSeeField(profile.gender_visibility, profile.id, viewerId, viewerBuddies)
    ? profile.gender
    : null;
}

export function visiblePronouns(
  profile: Pick<Profile, "id" | "pronouns" | "pronouns_visibility">,
  viewerId: string | undefined,
  viewerBuddies: Buddy[] | undefined,
) {
  return canSeeField(profile.pronouns_visibility, profile.id, viewerId, viewerBuddies)
    ? profile.pronouns
    : null;
}
