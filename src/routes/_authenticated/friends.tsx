import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, Search, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/messenger/Avatar";
import { useBuddies, useProfiles } from "@/hooks/use-chat";
import { useAuth, useMyProfile } from "@/hooks/use-auth";
import { useOpenDirect } from "@/hooks/use-direct";
import { nameColorStyle, siteRoleLabel, siteRoleOf, useSiteRoles } from "@/hooks/use-roles";
import type { AppRole } from "@/lib/admin";
import { accentFor, isOnline, removeBuddy, type Profile } from "@/lib/chat";
import { countryFlag } from "@/lib/country-flags";

const pageTitle = "My friends — DueChat";
const pageDescription =
  "See every friend on your DueChat list with their profile, online status, and one-click private messaging.";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({
    meta: [
      { title: pageTitle },
      { name: "description", content: pageDescription },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: pageDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FriendsPage,
});

function FriendCard({
  friend,
  nickname,
  role,
  onPm,
  onDelete,
  pmPending,
  deletePending,
}: {
  friend: Profile;
  nickname: string | null;
  role: AppRole | null;
  onPm: () => void;
  onDelete: () => void;
  pmPending: boolean;
  deletePending: boolean;
}) {
  const online = isOnline(friend);
  const roleLabel = siteRoleLabel(role);
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar
          name={friend.display_name || friend.username}
          accent={accentFor(friend.id)}
          avatarPath={friend.avatar_url}
          online={online}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/u/$username"
              params={{ username: friend.username }}
              className="truncate text-base font-semibold hover:underline"
              style={nameColorStyle(role, friend.name_color)}
            >
              {nickname || friend.display_name || friend.username}
            </Link>
            {friend.country ? <span aria-hidden>{countryFlag(friend.country)}</span> : null}
            {roleLabel ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {roleLabel}
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">@{friend.username}</p>
          <p className="mt-1 text-xs">
            <span className={online ? "text-emerald-500" : "text-muted-foreground"}>
              {online ? "Online now" : "Offline"}
            </span>
            {friend.status_message ? (
              <span className="text-muted-foreground"> — {friend.status_message}</span>
            ) : null}
          </p>
        </div>
      </div>

      {friend.bio ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">{friend.bio}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPm}
          disabled={pmPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          <MessageSquare className="size-3.5" />
          {pmPending ? "Opening…" : "Send PM"}
        </button>
        <Link
          to="/u/$username"
          params={{ username: friend.username }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <UserRound className="size-3.5" />
          View profile
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={deletePending}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
        >
          <Trash2 className="size-3.5" />
          Delete friend
        </button>
      </div>
    </li>
  );
}

function FriendsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: me } = useMyProfile(user?.id);
  const { data: profiles = [], isLoading: profilesLoading } = useProfiles();
  const { data: buddies = [], isLoading: buddiesLoading } = useBuddies(me?.id);
  const { data: roles } = useSiteRoles(!!me?.id);
  const { open: openDirect, pending: pmPending } = useOpenDirect(me?.id);
  const [search, setSearch] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const nicknames = useMemo(
    () => new Map(buddies.map((b) => [b.buddy_id, b.nickname])),
    [buddies],
  );

  const friends = useMemo(() => {
    const ids = new Set(buddies.map((b) => b.buddy_id));
    const term = search.trim().toLowerCase();
    return profiles
      .filter((p) => ids.has(p.id))
      .filter((p) =>
        term
          ? `${p.display_name} ${p.username} ${nicknames.get(p.id) ?? ""}`
              .toLowerCase()
              .includes(term)
          : true,
      )
      .sort((a, b) => {
        const oa = isOnline(a) ? 0 : 1;
        const ob = isOnline(b) ? 0 : 1;
        if (oa !== ob) return oa - ob;
        return (a.display_name || a.username).localeCompare(b.display_name || b.username);
      });
  }, [buddies, profiles, search, nicknames]);

  const onlineCount = friends.filter((f) => isOnline(f)).length;
  const loading = profilesLoading || buddiesLoading;

  async function handleDelete(friend: Profile) {
    if (!me?.id) return;
    if (confirm !== friend.id) {
      setConfirm(friend.id);
      toast.info(`Tap delete again to remove ${friend.display_name || friend.username}.`);
      return;
    }
    setRemoving(friend.id);
    try {
      await removeBuddy(me.id, friend.id);
      await queryClient.invalidateQueries({ queryKey: ["buddies"] });
      toast.success(`${friend.display_name || friend.username} removed from your friends.`);
    } catch {
      toast.error("Could not remove that friend. Please try again.");
    } finally {
      setRemoving(null);
      setConfirm(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="mb-5 flex items-center gap-3">
        <Link
          to="/chat"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <ArrowLeft className="size-3.5" />
          Messenger
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">My friends</h1>
          <p className="text-xs text-muted-foreground">
            {friends.length} friend{friends.length === 1 ? "" : "s"} · {onlineCount} online
          </p>
        </div>
      </div>

      <label className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your friends"
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your friends…</p>
      ) : friends.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">No friends on your list yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use Add Friends in your contacts panel, or meet people in a chat room.
          </p>
          <Link
            to="/rooms"
            className="mt-3 inline-flex rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Browse rooms
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {friends.map((friend) => {
            const role = siteRoleOf(roles, friend.id);
            return (
              <FriendCard
                key={friend.id}
                friend={friend}
                nickname={nicknames.get(friend.id) ?? null}
                role={role}
                onPm={() => void openDirect(friend.id)}
                onDelete={() => void handleDelete(friend)}
                pmPending={pmPending === friend.id}
                deletePending={removing === friend.id}
              />
            );
          })}
        </ul>
      )}
    </main>
  );
}
