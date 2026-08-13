/**
 * In-app floating room windows.
 *
 * Rooms open as draggable, resizable panels inside the app (like the edit-room
 * dialog) so nothing depends on OS or browser pop-up permissions. Each panel
 * can still be detached into a real window on the desktop apps.
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type FloatingKind = "room" | "im";

export type FloatingRoom = {
  roomId: string;
  kind: FloatingKind;
  title: string;
  z: number;
  minimized: boolean;
};

type Ctx = {
  panels: FloatingRoom[];
  open: (roomId: string, kind: FloatingKind, title: string) => void;
  close: (roomId: string) => void;
  focus: (roomId: string) => void;
  toggleMinimized: (roomId: string) => void;
};

const FloatingRoomsContext = createContext<Ctx | null>(null);

/** Floating panels only make sense where there's room for them. */
export function supportsFloatingRooms(): boolean {
  if (typeof window === "undefined") return false;
  if (window.opener) return false;
  if (/(^|[?&])popout=1(&|$)/.test(window.location.search)) return false;
  return window.innerWidth >= 768;
}

export function FloatingRoomsProvider({ children }: { children: ReactNode }) {
  const [panels, setPanels] = useState<FloatingRoom[]>([]);
  const [topZ, setTopZ] = useState(60);

  const focus = useCallback((roomId: string) => {
    setTopZ((z) => {
      const next = z + 1;
      setPanels((prev) => prev.map((p) => (p.roomId === roomId ? { ...p, z: next } : p)));
      return next;
    });
  }, []);

  const open = useCallback(
    (roomId: string, kind: FloatingKind, title: string) => {
      setTopZ((z) => {
        const next = z + 1;
        setPanels((prev) =>
          prev.some((p) => p.roomId === roomId)
            ? prev.map((p) => (p.roomId === roomId ? { ...p, z: next, minimized: false } : p))
            : [...prev, { roomId, kind, title, z: next, minimized: false }],
        );
        return next;
      });
    },
    [],
  );

  const close = useCallback((roomId: string) => {
    setPanels((prev) => prev.filter((p) => p.roomId !== roomId));
  }, []);

  const toggleMinimized = useCallback((roomId: string) => {
    setPanels((prev) =>
      prev.map((p) => (p.roomId === roomId ? { ...p, minimized: !p.minimized } : p)),
    );
  }, []);

  const value = useMemo(
    () => ({ panels, open, close, focus, toggleMinimized }),
    [panels, open, close, focus, toggleMinimized],
  );

  return <FloatingRoomsContext.Provider value={value}>{children}</FloatingRoomsContext.Provider>;
}

export function useFloatingRooms(): Ctx | null {
  return useContext(FloatingRoomsContext);
}
