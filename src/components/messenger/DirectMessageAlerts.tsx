import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { counterpartId, type Profile, type Room } from "@/lib/chat";
import { playSound, useSoundUnlock } from "@/lib/sounds";

/**
 * Rings and pops a toast when a direct message arrives from someone else.
 * Stays quiet for the conversation that is already open on screen.
 */
export function DirectMessageAlerts({
  rooms,
  profiles,
  meId,
  activeRoomId,
}: {
  rooms: Room[];
  profiles: Profile[];
  meId: string;
  activeRoomId?: string;
}) {
  const navigate = useNavigate();
  useSoundUnlock();

  // Keep the latest lists in a ref so the realtime channel is created once.
  const state = useRef({ rooms, profiles, activeRoomId });
  state.current = { rooms, profiles, activeRoomId };

  useEffect(() => {
    if (!meId) return;
    const channel = supabase
      .channel(`dm-alert:${meId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as { room_id?: string; user_id?: string; body?: string };
          if (!row.room_id || !row.user_id || row.user_id === meId) return;
          const { rooms: list, profiles: people, activeRoomId: openId } = state.current;
          const room = list.find((r) => r.id === row.room_id);
          if (!room?.is_direct) return;
          if (!room.direct_key?.includes(meId)) return;
          if (room.id === openId && document.visibilityState === "visible") return;

          const sender =
            people.find((p) => p.id === row.user_id) ??
            people.find((p) => p.id === counterpartId(room, meId));
          const name = sender?.display_name ?? "New message";
          const body = (row.body ?? "").startsWith("::") ? "Sent you something" : (row.body ?? "");

          playSound("message");
          toast(name, {
            description: body.slice(0, 120) || "Sent you a message",
            action: {
              label: "Open",
              onClick: () =>
                void navigate({ to: "/chat/$roomId", params: { roomId: room.id } }),
            },
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [meId, navigate]);

  return null;
}
