import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchBuddies,
  fetchMemberships,
  fetchMessages,
  fetchProfiles,
  fetchRoomAdmins,
  fetchRoomBans,
  fetchRoomEvents,
  fetchRooms,
  fetchRoomSilences,
  touchPresence,
} from "@/lib/chat";
import { fetchBlocks } from "@/lib/blocks";
import { fetchMyRoomInvites, fetchSentRoomInvites } from "@/lib/room-invites";

export function useRooms() {
  return useQuery({ queryKey: ["rooms"], queryFn: fetchRooms });
}

export function useMemberships() {
  return useQuery({ queryKey: ["memberships"], queryFn: fetchMemberships });
}

export function useProfiles() {
  return useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles, refetchInterval: 30_000 });
}

export function useMessages(roomId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["messages", roomId],
    queryFn: () => fetchMessages(roomId),
    enabled,
  });
}

export function useRoomEvents(roomId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["room-events", roomId],
    queryFn: () => fetchRoomEvents(roomId),
    enabled,
  });
}

export function useRoomAdmins(roomId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["room-admins", roomId],
    queryFn: () => fetchRoomAdmins(roomId),
    enabled,
  });
}

export function useRoomBans(roomId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["room-bans", roomId],
    queryFn: () => fetchRoomBans(roomId),
    enabled,
  });
}

export function useBuddies(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["buddies", ownerId],
    queryFn: () => fetchBuddies(ownerId!),
    enabled: !!ownerId,
  });
}

/** Silence ("dot") list for a room. */
export function useRoomSilences(roomId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["room-silences", roomId],
    queryFn: () => fetchRoomSilences(roomId),
    enabled,
  });
}

/** My personal block list. */
export function useBlocks(userId: string | undefined) {
  return useQuery({
    queryKey: ["blocks", userId],
    queryFn: () => fetchBlocks(userId!),
    enabled: !!userId,
  });
}

/** Room invites waiting for me. */
export function useMyRoomInvites(userId: string | undefined) {
  return useQuery({
    queryKey: ["room-invites", userId],
    queryFn: () => fetchMyRoomInvites(userId!),
    enabled: !!userId,
  });
}

/** Invites already sent for a room, so the panel can show "Invited". */
export function useSentRoomInvites(roomId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["room-invites-sent", roomId],
    queryFn: () => fetchSentRoomInvites(roomId),
    enabled,
  });
}

/** Keeps queries fresh from realtime table changes. */
export function useChatRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("chat-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        const roomId =
          (payload.new as { room_id?: string } | null)?.room_id ??
          (payload.old as { room_id?: string } | null)?.room_id;
        if (roomId) void queryClient.invalidateQueries({ queryKey: ["messages", roomId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["rooms"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["memberships"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_events" }, (payload) => {
        const roomId = (payload.new as { room_id?: string } | null)?.room_id;
        if (roomId) void queryClient.invalidateQueries({ queryKey: ["room-events", roomId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["profiles"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_admins" }, (payload) => {
        const roomId =
          (payload.new as { room_id?: string } | null)?.room_id ??
          (payload.old as { room_id?: string } | null)?.room_id;
        if (roomId) void queryClient.invalidateQueries({ queryKey: ["room-admins", roomId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_bans" }, (payload) => {
        const roomId =
          (payload.new as { room_id?: string } | null)?.room_id ??
          (payload.old as { room_id?: string } | null)?.room_id;
        if (roomId) void queryClient.invalidateQueries({ queryKey: ["room-bans", roomId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "buddies" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["buddies"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_blocks" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["blocks"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_silences" }, (payload) => {
        const roomId =
          (payload.new as { room_id?: string } | null)?.room_id ??
          (payload.old as { room_id?: string } | null)?.room_id;
        if (roomId) void queryClient.invalidateQueries({ queryKey: ["room-silences", roomId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_invites" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["room-invites"] });
        void queryClient.invalidateQueries({ queryKey: ["room-invites-sent"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/** Marks the signed-in user as online while the app is open. */
export function usePresenceHeartbeat(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    void touchPresence(userId);
    const interval = window.setInterval(() => void touchPresence(userId), 45_000);
    return () => window.clearInterval(interval);
  }, [userId]);
}
