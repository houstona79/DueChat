import { useNavigate } from "@tanstack/react-router";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import { supabase } from "@/integrations/supabase/client";
import { accentFor, counterpartId, type Profile, type Room } from "@/lib/chat";
import { setPendingCall } from "@/lib/call-invites";

type Ring = { roomId: string; callerId: string; mode: "voice" | "video" };

/**
 * Watches the call channel of every direct conversation and rings when the
 * other person is live in a voice or video call. We join the presence channel
 * without tracking ourselves, so watching never looks like joining.
 */
export function IncomingCallWatcher({
  rooms,
  profiles,
  meId,
}: {
  rooms: Room[];
  profiles: Profile[];
  meId: string;
}) {
  const navigate = useNavigate();
  const [rings, setRings] = useState<Ring[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const directRooms = rooms.filter((r) => r.is_direct && r.direct_key?.includes(meId));
  const directKeys = directRooms.map((r) => r.id).sort().join(",");

  useEffect(() => {
    if (!meId || !directKeys) return;
    const ids = directKeys.split(",");
    const channels = ids.map((roomId) => {
      const channel = supabase.channel(`ring:${roomId}`, {
        config: { presence: { key: `watch-${meId}` } },
      });
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_id: string; mode: "voice" | "video" }>();
        const others = Object.values(state)
          .flat()
          .filter((p) => p.user_id && p.user_id !== meId);
        setRings((prev) => {
          const without = prev.filter((r) => r.roomId !== roomId);
          if (others.length === 0) return without;
          const first = others[0];
          if (!first) return without;
          return [...without, { roomId, callerId: first.user_id, mode: first.mode ?? "voice" }];
        });
        if (others.length === 0) setDismissed((d) => d.filter((id) => id !== roomId));
      });
      channel.subscribe();
      return channel;
    });
    return () => {
      channels.forEach((c) => {
        void supabase.removeChannel(c);
      });
      setRings([]);
    };
  }, [directKeys, meId]);

  const active = rings.filter((r) => !dismissed.includes(r.roomId));
  if (active.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      {active.map((ring) => {
        const room = directRooms.find((r) => r.id === ring.roomId);
        const caller =
          profiles.find((p) => p.id === ring.callerId) ??
          profiles.find((p) => p.id === (room ? counterpartId(room, meId) : ""));
        const name = caller?.display_name ?? "Someone";
        return (
          <div
            key={ring.roomId}
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-border bg-sidebar/95 px-3 py-2.5 shadow-lg backdrop-blur-sm"
          >
            <Avatar
              name={name}
              accent={accentFor(caller?.id ?? ring.roomId)}
              avatarPath={caller?.avatar_url ?? null}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">
                Incoming {ring.mode === "video" ? "video" : "voice"} call…
              </p>
            </div>
            <button
              onClick={() => {
                setPendingCall({ roomId: ring.roomId, mode: ring.mode });
                void navigate({ to: "/chat/$roomId", params: { roomId: ring.roomId } });
              }}
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
              aria-label={`Answer call from ${name}`}
            >
              {ring.mode === "video" ? <Video className="size-4" /> : <Phone className="size-4" />}
            </button>
            <button
              onClick={() => setDismissed((d) => [...d, ring.roomId])}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-secondary"
              aria-label="Decline call"
            >
              <PhoneOff className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
