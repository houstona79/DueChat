import { useEffect, useRef } from "react";
import { Video, VideoOff, X } from "lucide-react";
import { Avatar } from "./Avatar";
import type { CallPeer } from "@/hooks/use-group-call";
import { accentFor } from "@/lib/chat";
import { attachStream } from "@/lib/webrtc";
import { cn } from "@/lib/utils";

/**
 * Slide-out panel of room cameras. Video only — every element stays muted so
 * voice keeps flowing through the Talk bar's audio elements instead.
 */
export function CamPanel({
  open,
  onClose,
  myName,
  myStream,
  camOn,
  onToggleCam,
  participants,
}: {
  open: boolean;
  onClose: () => void;
  myName: string;
  myStream: MediaStream | null;
  camOn: boolean;
  onToggleCam: () => void;
  participants: CallPeer[];
}) {
  const livePeers = participants.filter((p) => {
    const tracks = p.stream?.getVideoTracks() ?? [];
    return (
      tracks.length > 0 && (p.camOn || tracks.some((t) => t.readyState === "live" && !t.muted))
    );
  });

  return (
    <section
      className={cn(
        "absolute inset-y-0 right-0 z-20 flex w-full max-w-[92%] flex-col border-l border-border bg-sidebar pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-200 ease-out sm:max-w-xs",
        open ? "translate-x-0" : "pointer-events-none translate-x-full",
      )}
      aria-hidden={!open}
      role="region"
      aria-label="Room cameras"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h3 className="text-sm font-semibold">Cams</h3>
        <button
          onClick={onClose}
          className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
          aria-label="Close cameras"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onToggleCam}
          aria-pressed={camOn}
          className={cn(
            "flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold",
            camOn ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground",
          )}
        >
          {camOn ? <VideoOff className="size-4" /> : <Video className="size-4" />}
          {camOn ? "Stop my camera" : "Go live on camera"}
        </button>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Cams are video only — your voice stays on the Talk bar.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {camOn ? <CamTile name={`${myName} (you)`} id="me" stream={myStream} /> : null}
        {livePeers.map((peer) => (
          <CamTile key={peer.userId} name={peer.name} id={peer.userId} stream={peer.stream} />
        ))}
        {!camOn && livePeers.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nobody is on camera yet. Go live to show yours.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function CamTile({ name, id, stream }: { name: string; id: string; stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    attachStream(ref.current, stream);
    if (ref.current) ref.current.muted = true;
  }, [stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-secondary">
      {stream ? (
        <video ref={ref} autoPlay playsInline muted className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center">
          <Avatar name={name} accent={accentFor(id)} />
        </div>
      )}
      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-background/85 to-transparent px-3 py-1.5 text-[11px] font-medium">
        {name}
      </span>
    </div>
  );
}
