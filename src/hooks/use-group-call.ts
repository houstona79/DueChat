import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CallPeer = {
  userId: string;
  name: string;
  stream: MediaStream | null;
  camOn: boolean;
  muted: boolean;
};

type SignalPayload = {
  from: string;
  to: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

/**
 * Multi-party WebRTC mesh for one room, signalled over Supabase Realtime.
 * Every participant in the room's call channel connects to every other one,
 * which keeps small group calls (roughly up to 6 people) simple and serverless.
 */
export function useGroupCall({
  roomId,
  userId,
  name,
  mode,
  enabled,
}: {
  roomId: string;
  userId: string;
  name: string;
  mode: "voice" | "video";
  enabled: boolean;
}) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [peers, setPeers] = useState<Record<string, CallPeer>>({});
  const [muted, setMuted] = useState(false);
  const [camOn, setCamOn] = useState(mode === "video");

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const namesRef = useRef<Map<string, string>>(new Map());

  const patchPeer = useCallback((peerId: string, patch: Partial<CallPeer>) => {
    setPeers((prev) => {
      const existing = prev[peerId] ?? {
        userId: peerId,
        name: namesRef.current.get(peerId) ?? "Guest",
        stream: null,
        camOn: false,
        muted: false,
      };
      return { ...prev, [peerId]: { ...existing, ...patch } };
    });
  }, []);

  const dropPeer = useCallback((peerId: string) => {
    pcsRef.current.get(peerId)?.close();
    pcsRef.current.delete(peerId);
    setPeers((prev) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  // 1. Local media
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError("This browser can't access the camera or microphone.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video" ? { facingMode: "user" } : false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        setMediaError(null);
      } catch {
        if (!cancelled) setMediaError("Camera and microphone access was blocked.");
      }
    };
    void start();
    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    };
  }, [enabled, mode]);

  // 2. Signalling + mesh
  useEffect(() => {
    if (!enabled || !userId || !roomId) return;

    const channel = supabase.channel(`call:${roomId}`, {
      config: { presence: { key: userId }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    const send = (payload: SignalPayload) =>
      channel.send({ type: "broadcast", event: "signal", payload });

    const createPeer = (peerId: string) => {
      const existing = pcsRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcsRef.current.set(peerId, pc);

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void send({ from: userId, to: peerId, candidate: event.candidate.toJSON() });
        }
      };
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) patchPeer(peerId, { stream });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          dropPeer(peerId);
        }
      };
      patchPeer(peerId, {});
      return pc;
    };

    const callPeer = async (peerId: string) => {
      const pc = createPeer(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await send({ from: userId, to: peerId, description: offer });
    };

    channel.on("broadcast", { event: "signal" }, async ({ payload }) => {
      const signal = payload as SignalPayload;
      if (signal.to !== userId || signal.from === userId) return;
      const pc = createPeer(signal.from);
      try {
        if (signal.description) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.description));
          if (signal.description.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await send({ from: userId, to: signal.from, description: answer });
          }
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch {
        // Ignore out-of-order signalling; presence re-sync repairs the mesh.
      }
    });

    channel.on("broadcast", { event: "state" }, ({ payload }) => {
      const state = payload as { from: string; camOn: boolean; muted: boolean };
      if (state.from === userId) return;
      patchPeer(state.from, { camOn: state.camOn, muted: state.muted });
    });

    channel.on("presence", { event: "sync" }, () => {
      const presence = channel.presenceState<{ user_id: string; name: string }>();
      const ids = new Set<string>();
      Object.values(presence).forEach((entries) => {
        entries.forEach((entry) => {
          if (!entry.user_id || entry.user_id === userId) return;
          ids.add(entry.user_id);
          namesRef.current.set(entry.user_id, entry.name ?? "Guest");
        });
      });
      // Deterministic caller so only one side of each pair creates the offer.
      ids.forEach((peerId) => {
        if (!pcsRef.current.has(peerId) && userId < peerId) void callPeer(peerId);
        else patchPeer(peerId, { name: namesRef.current.get(peerId) ?? "Guest" });
      });
      pcsRef.current.forEach((_, peerId) => {
        if (!ids.has(peerId)) dropPeer(peerId);
      });
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel.track({ user_id: userId, name, mode });
      }
    });

    return () => {
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      setPeers({});
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [enabled, roomId, userId, name, mode, patchPeer, dropPeer]);

  // 3. Local track toggles, broadcast so everyone's tiles stay accurate.
  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = camOn));
    void channelRef.current?.send({
      type: "broadcast",
      event: "state",
      payload: { from: userId, camOn, muted },
    });
  }, [muted, camOn, userId, localStream]);

  const participants = useMemo(() => Object.values(peers), [peers]);

  return {
    localStream,
    mediaError,
    participants,
    muted,
    camOn,
    setMuted,
    setCamOn,
  };
}