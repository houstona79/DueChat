import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getMediaStreamResilient,
  isWebRTCSupported,
  mediaErrorMessage,
} from "@/lib/webrtc";

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
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
  // Mobile networks (Android on 4G/5G especially) sit behind symmetric NAT, so
  // STUN alone can't connect. Relay candidates are required there.
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
      "turns:openrelay.metered.ca:443",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

type PeerCtx = {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  audioSender: RTCRtpSender | null;
  videoSender: RTCRtpSender | null;
  remote: MediaStream;
};

/**
 * Multi-party WebRTC mesh for one room, signalled over Supabase Realtime.
 * Uses the "perfect negotiation" pattern plus explicit sendrecv transceivers so
 * Chrome, Safari/iOS, Firefox and Edge can all interop (and so turning a camera
 * on mid-call works even in a voice-only call).
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
  const pcsRef = useRef<Map<string, PeerCtx>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const namesRef = useRef<Map<string, string>>(new Map());
  const camOnRef = useRef(camOn);
  const mutedRef = useRef(muted);
  camOnRef.current = camOn;
  mutedRef.current = muted;

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
    pcsRef.current.get(peerId)?.pc.close();
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
      if (!isWebRTCSupported()) {
        setMediaError("This browser doesn't support live calls. Try Chrome, Safari, Firefox or Edge.");
        return;
      }
      try {
        let stream: MediaStream;
        try {
          stream = await getMediaStreamResilient({
            audio: true,
            video: mode === "video" ? { facingMode: "user" } : false,
          });
        } catch (error) {
          // Android: camera may be busy or unavailable — still join with audio.
          if (mode !== "video") throw error;
          stream = await getMediaStreamResilient({ audio: true, video: false });
          setMediaError(
            "We couldn't reach your camera, so you joined with audio only. Close other camera apps and tap the camera button to retry.",
          );
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (stream.getVideoTracks().length > 0 || mode !== "video") setMediaError(null);
        setCamOn(stream.getVideoTracks().length > 0);
        setMuted(stream.getAudioTracks().length === 0);
        // Media may resolve after peers exist — push tracks into existing senders.
        const audio = stream.getAudioTracks()[0] ?? null;
        const video = stream.getVideoTracks()[0] ?? null;
        pcsRef.current.forEach((ctx) => {
          void ctx.audioSender?.replaceTrack(audio);
          void ctx.videoSender?.replaceTrack(video);
        });
      } catch (error) {
        if (!cancelled) setMediaError(mediaErrorMessage(error));
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
    if (!enabled || !userId || !roomId || !isWebRTCSupported()) return;

    const channel = supabase.channel(`call:${roomId}`, {
      config: { presence: { key: userId }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    const send = (payload: SignalPayload) =>
      channel.send({ type: "broadcast", event: "signal", payload });

    const createPeer = (peerId: string) => {
      const existing = pcsRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        bundlePolicy: "max-bundle",
        iceCandidatePoolSize: 4,
      });
      const remote = new MediaStream();
      const ctx: PeerCtx = {
        pc,
        // Deterministic roles: the higher id yields on offer collisions.
        polite: userId > peerId,
        makingOffer: false,
        ignoreOffer: false,
        audioSender: null,
        videoSender: null,
        remote,
      };
      pcsRef.current.set(peerId, ctx);

      // Always negotiate both directions so a camera can be enabled later.
      const local = localStreamRef.current;
      const audioTrack = local?.getAudioTracks()[0] ?? null;
      const videoTrack = local?.getVideoTracks()[0] ?? null;
      try {
        ctx.audioSender = pc.addTransceiver(audioTrack ?? "audio", {
          direction: "sendrecv",
          streams: local ? [local] : [],
        }).sender;
        ctx.videoSender = pc.addTransceiver(videoTrack ?? "video", {
          direction: "sendrecv",
          streams: local ? [local] : [],
        }).sender;
      } catch {
        // Very old implementations: fall back to addTrack only.
        if (local) local.getTracks().forEach((t) => pc.addTrack(t, local));
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void send({ from: userId, to: peerId, candidate: event.candidate.toJSON() });
        }
      };
      pc.ontrack = (event) => {
        // Safari doesn't always populate event.streams — build our own stream.
        if (!remote.getTracks().includes(event.track)) remote.addTrack(event.track);
        // A fresh MediaStream identity is required so React re-attaches the
        // element when a second (video) track arrives after the audio track.
        const snapshot = () => new MediaStream(remote.getTracks());
        patchPeer(peerId, {
          stream: snapshot(),
          ...(event.track.kind === "video" ? { camOn: true } : {}),
        });
        event.track.onunmute = () => patchPeer(peerId, { stream: snapshot() });
        event.track.onended = () => {
          try {
            remote.removeTrack(event.track);
          } catch {
            /* noop */
          }
          patchPeer(peerId, {
            stream: snapshot(),
            ...(event.track.kind === "video" ? { camOn: false } : {}),
          });
        };
      };
      pc.onnegotiationneeded = async () => {
        try {
          ctx.makingOffer = true;
          await pc.setLocalDescription();
          if (pc.localDescription) {
            await send({ from: userId, to: peerId, description: pc.localDescription.toJSON() });
          }
        } catch {
          /* renegotiation retried on next presence sync */
        } finally {
          ctx.makingOffer = false;
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          try {
            pc.restartIce?.();
          } catch {
            /* noop */
          }
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") dropPeer(peerId);
      };
      patchPeer(peerId, {});
      // Tell the new peer our current mic/cam state right away — otherwise they
      // only learn about it the next time we toggle something.
      void channel.send({
        type: "broadcast",
        event: "state",
        payload: { from: userId, camOn: camOnRef.current, muted: mutedRef.current },
      });
      return ctx;
    };

    const callPeer = async (peerId: string) => {
      const ctx = createPeer(peerId);
      try {
        ctx.makingOffer = true;
        const offer = await ctx.pc.createOffer();
        await ctx.pc.setLocalDescription(offer);
        await send({ from: userId, to: peerId, description: ctx.pc.localDescription?.toJSON() ?? offer });
      } catch {
        /* noop */
      } finally {
        ctx.makingOffer = false;
      }
    };

    channel.on("broadcast", { event: "signal" }, async ({ payload }) => {
      const signal = payload as SignalPayload;
      if (signal.to !== userId || signal.from === userId) return;
      const ctx = createPeer(signal.from);
      const { pc } = ctx;
      try {
        if (signal.description) {
          const offerCollision =
            signal.description.type === "offer" &&
            (ctx.makingOffer || pc.signalingState !== "stable");
          ctx.ignoreOffer = !ctx.polite && offerCollision;
          if (ctx.ignoreOffer) return;
          if (offerCollision) {
            await Promise.all([
              pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit).catch(
                () => undefined,
              ),
              pc.setRemoteDescription(new RTCSessionDescription(signal.description)),
            ]);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.description));
          }
          if (signal.description.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await send({
              from: userId,
              to: signal.from,
              description: pc.localDescription?.toJSON() ?? answer,
            });
          }
        } else if (signal.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (error) {
            if (!ctx.ignoreOffer) throw error;
          }
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

    // Separate presence-only channel so watchers can ring without touching the
    // signalling channel (one channel per topic — sharing it breaks callbacks).
    const ring = supabase.channel(`ring:${roomId}`, {
      config: { presence: { key: userId } },
    });
    ring.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void ring.track({ user_id: userId, name, mode });
      }
    });

    return () => {
      pcsRef.current.forEach((ctx) => ctx.pc.close());
      pcsRef.current.clear();
      setPeers({});
      channelRef.current = null;
      void supabase.removeChannel(ring);
      void supabase.removeChannel(channel);
    };
  }, [enabled, roomId, userId, name, mode, patchPeer, dropPeer]);

  // 3. Local track toggles, broadcast so everyone's tiles stay accurate.
  useEffect(() => {
    const stream = localStreamRef.current;
    stream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    stream?.getVideoTracks().forEach((t) => (t.enabled = camOn));
    void channelRef.current?.send({
      type: "broadcast",
      event: "state",
      payload: { from: userId, camOn, muted },
    });
  }, [muted, camOn, userId, localStream]);

  // Voice call that turns its camera on: acquire video and push it to peers.
  useEffect(() => {
    if (!enabled || !camOn) return;
    const stream = localStreamRef.current;
    if (!stream || stream.getVideoTracks().length > 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const extra = await getMediaStreamResilient({ video: { facingMode: "user" } });
        const track = extra.getVideoTracks()[0];
        if (!track) return;
        if (cancelled || localStreamRef.current !== stream) {
          track.stop();
          return;
        }
        stream.addTrack(track);
        setLocalStream(new MediaStream(stream.getTracks()));
        pcsRef.current.forEach((ctx) => void ctx.videoSender?.replaceTrack(track));
      } catch (error) {
        if (!cancelled) {
          setMediaError(mediaErrorMessage(error));
          setCamOn(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [camOn, enabled]);

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
