/**
 * Renders the in-app floating room windows.
 *
 * Each panel embeds the room's own pop-out view, so it behaves exactly like a
 * detached window while staying inside the app. "Detach" hands the room to a
 * real OS window on the desktop apps (or a browser window on the web).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Maximize2, Minimize2, Minus, Square, X } from "lucide-react";
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
  const storeKey = `duechat.roomWindow.${panel.kind}`;
  const [size, setSize] = useState(() => {
    const fallback = {
      w: base.w,
      h: Math.min(base.h, typeof window === "undefined" ? base.h : window.innerHeight - 80),
    };
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(storeKey);
      if (!raw) return fallback;
      const saved = JSON.parse(raw) as { w?: number; h?: number };
      return {
        w: clamp(Number(saved.w) || fallback.w, MIN_W, window.innerWidth - 40),
        h: clamp(Number(saved.h) || fallback.h, MIN_H, window.innerHeight - 40),
      };
    } catch {
      return fallback;
    }
  });
  const [pos, setPos] = useState(() => {
    const offset = index * 28;
    const maxX = typeof window === "undefined" ? 0 : Math.max(8, window.innerWidth - base.w - 24);
    return { x: Math.min(maxX, 120 + offset), y: 60 + offset };
  });
  const [maximized, setMaximized] = useState(false);
  const [active, setActive] = useState(false);
  const preMax = useRef<{ pos: { x: number; y: number }; size: { w: number; h: number } } | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
    left: number;
    top: number;
    dir: ResizeDir;
  } | null>(null);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (drag.current) {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 120, e.clientX - drag.current.dx)),
        y: Math.max(0, Math.min(window.innerHeight - 48, e.clientY - drag.current.dy)),
      });
    } else if (resize.current) {
      const r = resize.current;
      const dx = e.clientX - r.x;
      const dy = e.clientY - r.y;
      let w = r.w;
      let h = r.h;
      let left = r.left;
      let top = r.top;
      if (r.dir.includes("e")) w = clamp(r.w + dx, MIN_W, window.innerWidth - r.left - 8);
      if (r.dir.includes("s")) h = clamp(r.h + dy, MIN_H, window.innerHeight - r.top - 8);
      if (r.dir.includes("w")) {
        w = clamp(r.w - dx, MIN_W, r.left + r.w);
        left = r.left + r.w - w;
      }
      if (r.dir.includes("n")) {
        h = clamp(r.h - dy, MIN_H, r.top + r.h);
        top = r.top + r.h - h;
      }
      setSize({ w, h });
      setPos({ x: left, y: top });
    }
  }, []);

  useEffect(() => {
    const stop = () => {
      if (resize.current) {
        try {
          window.localStorage.setItem(storeKey, JSON.stringify(size));
        } catch {
          /* storage unavailable */
        }
      }
      drag.current = null;
      resize.current = null;
      setActive(false);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stop);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stop);
    };
  }, [onPointerMove, size, storeKey]);

  if (!ctx) return null;

  const src = `/chat/${panel.roomId}?popout=1`;
  const frame = maximized
    ? { left: 8, top: 8, width: "calc(100vw - 16px)", height: "calc(100vh - 16px)" }
    : { left: pos.x, top: pos.y, width: size.w, height: panel.minimized ? undefined : size.h };

  return (
    <section
      aria-label={`${panel.title} window`}
      onPointerDown={() => ctx.focus(panel.roomId)}
      style={{ ...frame, zIndex: panel.z }}
      className="fixed flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
    >
      <header
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          if (maximized) return;
          drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
          setActive(true);
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
          onClick={() => {
            if (maximized) {
              const prev = preMax.current;
              if (prev) {
                setPos(prev.pos);
                setSize(prev.size);
              }
              setMaximized(false);
            } else {
              preMax.current = { pos, size };
              setMaximized(true);
            }
          }}
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
          aria-label={maximized ? "Restore size" : "Maximize window"}
          title={maximized ? "Restore size" : "Maximize window"}
        >
          {maximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
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
        className={cn(
          "min-h-0 w-full flex-1 border-0 bg-background",
          panel.minimized && "hidden",
          active && "pointer-events-none",
        )}
      />
      {panel.minimized || maximized
        ? null
        : HANDLES.map(({ dir, className }) => (
            <span
              key={dir}
              role="presentation"
              aria-hidden
              onPointerDown={(e) => {
                e.preventDefault();
                resize.current = {
                  x: e.clientX,
                  y: e.clientY,
                  w: size.w,
                  h: size.h,
                  left: pos.x,
                  top: pos.y,
                  dir,
                };
                setActive(true);
              }}
              className={cn("absolute z-10 touch-none", className)}
            />
          ))}
    </section>
  );
}

const MIN_W = 320;
const MIN_H = 300;

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const HANDLES: { dir: ResizeDir; className: string }[] = [
  { dir: "n", className: "left-3 right-3 top-0 h-1.5 cursor-ns-resize" },
  { dir: "s", className: "left-3 right-3 bottom-0 h-1.5 cursor-ns-resize" },
  { dir: "w", className: "top-3 bottom-3 left-0 w-1.5 cursor-ew-resize" },
  { dir: "e", className: "top-3 bottom-3 right-0 w-1.5 cursor-ew-resize" },
  { dir: "nw", className: "left-0 top-0 size-3 cursor-nwse-resize" },
  { dir: "ne", className: "right-0 top-0 size-3 cursor-nesw-resize" },
  { dir: "sw", className: "left-0 bottom-0 size-3 cursor-nesw-resize" },
  { dir: "se", className: "right-0 bottom-0 size-4 cursor-nwse-resize" },
];

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), Math.max(min, max));
}
