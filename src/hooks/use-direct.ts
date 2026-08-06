import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { openDirectRoom } from "@/lib/chat";

/** Opens (or creates) a 1:1 conversation and navigates to it. */
export function useOpenDirect(meId: string | undefined) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);

  const open = async (otherId: string) => {
    if (!meId || pending) return;
    setPending(otherId);
    try {
      const room = await openDirectRoom(meId, otherId);
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
      await navigate({ to: "/chat/$roomId", params: { roomId: room.id } });
    } finally {
      setPending(null);
    }
  };

  return { open, pending };
}
