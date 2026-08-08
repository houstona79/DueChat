import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { MailPlus, X } from "lucide-react";
import { Avatar } from "./Avatar";
import { useMyRoomInvites } from "@/hooks/use-chat";
import { acceptRoomInvite, dismissRoomInvite } from "@/lib/room-invites";
import { accentFor, type Profile, type Room } from "@/lib/chat";

/** Sidebar list of room invites waiting for the signed-in member. */
export function RoomInvites({
  me,
  rooms,
  profiles,
}: {
  me: Profile | null | undefined;
  rooms: Room[];
  profiles: Profile[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const { data: invites = [] } = useMyRoomInvites(me?.id);

  if (!me || invites.length === 0) return null;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["room-invites", me.id] });
    await queryClient.invalidateQueries({ queryKey: ["memberships"] });
  };

  return (
    <section className="mb-2" aria-label="Room invites">
      <h2 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Room invites · {invites.length}
      </h2>
      <ul className="space-y-1">
        {invites.map((invite) => {
          const room = rooms.find((r) => r.id === invite.room_id);
          const inviter = profiles.find((p) => p.id === invite.inviter_id);
          return (
            <li key={invite.id} className="rounded-2xl bg-secondary/60 px-3 py-2.5">
              <div className="flex items-center gap-3">
                <Avatar
                  name={inviter?.display_name ?? "Someone"}
                  accent={accentFor(invite.inviter_id)}
                  avatarPath={inviter?.avatar_url ?? null}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {room?.name ?? "A room"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {inviter?.display_name ?? "Someone"} invited you
                  </span>
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    setPending(invite.id);
                    try {
                      await acceptRoomInvite(invite, me.id);
                      await refresh();
                      await navigate({ to: "/chat/$roomId", params: { roomId: invite.room_id } });
                    } finally {
                      setPending(null);
                    }
                  }}
                  disabled={pending === invite.id}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                  aria-label={`Join ${room?.name ?? "the room"}`}
                >
                  <MailPlus className="size-4" />
                  Join
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setPending(invite.id);
                    try {
                      await dismissRoomInvite(invite.id);
                      await refresh();
                    } finally {
                      setPending(null);
                    }
                  }}
                  disabled={pending === invite.id}
                  aria-label="Decline invite"
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary disabled:opacity-60"
                >
                  <X className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}