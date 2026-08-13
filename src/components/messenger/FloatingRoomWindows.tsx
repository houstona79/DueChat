/**
 * Renders the in-app floating room windows.
 *
 * Each panel embeds the room's own pop-out view, so it behaves exactly like a
 * detached window while staying inside the app. "Detach" hands the room to a
 * real OS window on the desktop apps (or a browser window on the web).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Minus, Square, X } from "lucide-react";
import { useFloatingRooms } from "@/lib/floating-rooms";
import type { FloatingRoom } from "@/lib/floating-rooms";
import { isDesktopShell, openDetachedRoomWindow } from "@/lib/room-window";
import { cn } from "@/lib/utils";

export function FloatingRoomWindows() {
  const ctx = useFloatingRooms();
  if (!ctx || ctx.panels.length === 0) return null;
  return (
    <>
      {ctx.panels.map((panel, i) => (
        <FloatingRoomWindow key={panel.roomId} panel={panel} index={i} />
      ))}
    </>
  );
}

function FloatingRoomWindow({ panel, index }: { panel: FloatingRoom; index: number }) {
  const ctx = useFloatingRooms();
  const base = panel.kind === "im" ? { w: 400, h: 620 } : { w: 520, h: 780 };
  const [size, setSize] = useState(() => ({
    w: base.w,
    h: Math.min(base.h, typeof window === "undefined" ? base.h : window.innerHeight - 80),
  }));
  const [pos, setPos] = useState(() => {
    const offset = index * 28;
    const maxX = typeof window === "undefined" ? 0 : Math.max(8, window.innerWidth - base.w - 24);
    return { x: Math.min(maxX, 120 + offset), y: 60 + offset };
  });
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (drag.current) {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 120, e.clientX - drag.current.dx)),
        y: Math.max(0, Math.min(window.innerHeight - 48, e.clientY - drag.current.dy)),
      });
    } else if (resize.current) {
      const r = resize.current;
      setSize({
        w: Math.max(320, Math.min(window.innerWidth - 40, r.w + (e.clientX - r.x))),
        h: Math.max(320, Math.min(window.innerHeight - 40, r.h + (e.clientY - r.y))),
      });
    }
  }, []);

  useEffect(() => {
    const stop = () => {
      drag.current = null;
      resize.current = null;
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stop);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stop);
    };
  }, [onPointerMove]);

  if (!ctx) return null;

  const src = `/chat/${panel.roomId}?popout=1`;

  return (
    <section
      aria-label={`${panel.title} window`}
      onPointerDown={() => ctx.focus(panel.roomId)}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: panel.minimized ? undefined : size.h,
        zIndex: panel.z,
      }}
      className="fixed flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
    >
      <header
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
        }}
        onDoubleClick={() => ctx.toggleMinimized(panel.roomId)}
        className="flex shrink-0 cursor-grab items-center gap-2 border-b border-border bg-secondary/60 px-3 py-2 active:cursor-grabbing"
      >
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{panel.title}</span>
        <button
          type="button"
          onClick={() => {
            openDetachedRoomWindow(panel.roomId, panel.kind);
            ctx.close(panel.roomId);
          }}
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
          aria-label="Detach into its own window"
          title={isDesktopShell() ? "Detach into its own window" : "Open in a browser window"}
        >
          <ExternalLink className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => ctx.toggleMinimized(panel.roomId)}
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
          aria-label={panel.minimized ? "Restore window" : "Minimize window"}
        >
          {panel.minimized ? <Square className="size-3" /> : <Minus className="size-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => ctx.close(panel.roomId)}
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
          aria-label="Close window"
        >
          <X className="size-3.5" />
        </button>
      </header>
      <iframe
        title={`${panel.title} chat`}
        src={src}
        allow="camera; microphone; autoplay; display-capture; clipboard-write"
        className={cn("min-h-0 w-full flex-1 border-0 bg-background", panel.minimized && "hidden")}
      />
      {panel.minimized ? null : (
        <span
          role="presentation"
          onPointerDown={(e) => {
            resize.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
          }}
          className="absolute bottom-0 right-0 size-4 cursor-nwse-resize"
        />
      )}
    </section>
  );
}
