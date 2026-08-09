import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Search, UserPlus, X } from "lucide-react";
import { Avatar } from "./Avatar";
import { accentFor, isOnline, type Membership, type Profile } from "@/lib/chat";
import { inviteToRoom } from "@/lib/room-invites";
import { useSentRoomInvites } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";

/** Lets a room member invite other people into the room. */
export function InvitePanel({
  roomId,
  roomName,
  memberships,
  profiles,
  meId,
  onClose,
}: {
  roomId: string;
  roomName: string;
  memberships: Membership[];
  profiles: Profile[];
  meId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: sent = [] } = useSentRoomInvites(roomId, true);

  const memberIds = new Set(memberships.map((m) => m.user_id));
  const invitedIds = new Set(sent.map((i) => i.invitee_id));
  const q = query.trim().toLowerCase();
  const candidates = profiles
    .filter((p) => p.id !== meId && !memberIds.has(p.id))
    .filter((p) => !q || `${p.display_name} ${p.username}`.toLowerCase().includes(q))
    .sort((a, b) => Number(isOnline(b)) - Number(isOnline(a)));

  const invite = async (userId: string) => {
    setPending(userId);
    setError(null);
    try {
      await inviteToRoom(roomId, meId, userId);
      await queryClient.invalidateQueries({ queryKey: ["room-invites-sent", roomId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that invite.");
    } finally {
      setPending(null);
    }
  };

  return (
    <section
      className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[85%] flex-col border-l border-border bg-sidebar pb-[env(safe-area-inset-bottom)] shadow-xl sm:max-w-xs"
      role="region"
      aria-label={`Invite people to ${roomName}`}
    >
      <header className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h3 className="text-sm font-semibold">Invite to {roomName}</h3>
        <button
          onClick={onClose}
          aria-label="Close invites"
          className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </header>
      <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
        <Search className="size-4 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people"
          aria-label="Search people to invite"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {error ? (
        <p role="alert" className="px-4 pb-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {candidates.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            {profiles.length <= 1
              ? "No one else to invite yet."
              : "Everyone here is already in the room."}
          </li>
        ) : null}
        {candidates.map((p) => {
          const invited = invitedIds.has(p.id);
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl px-2 py-2">
              <Avatar
                name={p.display_name}
                accent={accentFor(p.id)}
                avatarPath={p.avatar_url}
                online={isOnline(p)}
                size="sm"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{p.display_name}</span>
                <span className="block truncate text-xs text-muted-foreground">@{p.username}</span>
              </span>
              <button
                type="button"
                onClick={() => void invite(p.id)}
                disabled={invited || pending === p.id}
                aria-label={
                  invited ? `${p.display_name} already invited` : `Invite ${p.display_name}`
                }
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold",
                  invited
                    ? "bg-secondary text-muted-foreground"
                    : "bg-primary text-primary-foreground disabled:opacity-60",
                )}
              >
                {invited ? <Check className="size-4" /> : <UserPlus className="size-4" />}
                {invited ? "Invited" : "Invite"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
