import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ROOM_CATEGORIES,
  ROOM_NAME_COLORS,
  ROOM_RATING_LABEL,
  setRoomLock,
  updateRoomSettings,
  type Room,
  type RoomRating,
} from "@/lib/chat";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Owner-only editor for an existing room. */
export function EditRoomDialog({ room, onDone }: { room: Room; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(room.name);
  const [topic, setTopic] = useState(room.topic ?? "");
  const [category, setCategory] = useState(room.category || "General");
  const [rating, setRating] = useState<RoomRating>(room.rating);
  const [status, setStatus] = useState(room.status_message ?? "");
  const [invisible, setInvisible] = useState(room.invisible);
  const [color, setColor] = useState<string | null>(room.name_color);
  const [lockCode, setLockCode] = useState("");
  const [clearLock, setClearLock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateRoomSettings(room.id, {
        name: name.trim(),
        topic: topic.trim() || null,
        category,
        rating,
        status_message: status.trim() || null,
        invisible,
        name_color: color,
      });
      if (clearLock) await setRoomLock(room.id, null);
      else if (lockCode.trim()) await setRoomLock(room.id, lockCode.trim());
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the room.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onDone();
      }}
    >
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-4 py-3 text-left">
          <DialogTitle className="text-base">Edit room</DialogTitle>
          <DialogDescription className="text-xs">
            Update the name, color, audience and privacy of your room.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="edit-room-name">
              Room name
            </label>
            <input
              id="edit-room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-base outline-none sm:text-sm"
              style={color ? { color } : undefined}
            />
            <span className="mt-3 block text-[11px] font-medium text-muted-foreground">
              Room name color
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setColor(null)}
                className={cn(
                  "min-h-8 rounded-full border px-2 text-[11px]",
                  color === null
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                Default
              </button>
              {ROOM_NAME_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  aria-label={c.label}
                  title={c.label}
                  aria-pressed={color === c.hex}
                  onClick={() => setColor(c.hex)}
                  className={cn(
                    "size-8 rounded-full border-2",
                    color === c.hex ? "border-foreground" : "border-border",
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            <label
              className="mt-3 block text-[11px] font-medium text-muted-foreground"
              htmlFor="edit-room-topic"
            >
              Topic (optional)
            </label>
            <input
              id="edit-room-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={120}
              className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-base outline-none sm:text-sm"
            />
            <label
              className="mt-2 block text-[11px] font-medium text-muted-foreground"
              htmlFor="edit-room-status"
            >
              Room status (optional)
            </label>
            <input
              id="edit-room-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              maxLength={120}
              className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-base outline-none sm:text-sm"
            />
            <label
              className="mt-2 block text-[11px] font-medium text-muted-foreground"
              htmlFor="edit-room-category"
            >
              Category
            </label>
            <select
              id="edit-room-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-base outline-none sm:text-sm"
            >
              {[...new Set([...ROOM_CATEGORIES, category])].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-[11px] font-medium text-muted-foreground">Audience</span>
            <div className="mt-1 flex gap-2">
              {(["G", "R"] as RoomRating[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRating(option)}
                  className={cn(
                    "flex-1 rounded-xl px-3 py-2 text-xs font-medium",
                    rating === option
                      ? option === "R"
                        ? "bg-destructive/20 text-destructive"
                        : "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {option} · {ROOM_RATING_LABEL[option]}
                </button>
              ))}
            </div>
            <span className="mt-3 block text-[11px] font-medium text-muted-foreground">Privacy</span>
            <label className="mt-1 flex items-start gap-2 rounded-xl bg-secondary px-3 py-2 text-xs">
              <input
                type="checkbox"
                checked={invisible}
                onChange={(e) => setInvisible(e.target.checked)}
                className="mt-0.5 size-4 shrink-0"
              />
              <span>
                <span className="block font-medium">Invisible room</span>
                <span className="block text-muted-foreground">
                  Hidden from the room list — only members and people you invite can see it.
                </span>
              </span>
            </label>
            <label
              className="mt-2 block text-[11px] font-medium text-muted-foreground"
              htmlFor="edit-room-lock"
            >
              Entry code
            </label>
            <input
              id="edit-room-lock"
              value={lockCode}
              onChange={(e) => setLockCode(e.target.value)}
              maxLength={24}
              autoComplete="off"
              disabled={clearLock}
              placeholder={room.locked ? "Enter a new code to replace it" : "Leave blank for an open room"}
              className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-base outline-none placeholder:text-muted-foreground disabled:opacity-50 sm:text-sm"
            />
            {room.locked ? (
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={clearLock}
                  onChange={(e) => setClearLock(e.target.checked)}
                  className="size-4 shrink-0"
                />
                Remove the entry code and open this room
              </label>
            ) : null}
            {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
          </div>
          <div className="flex gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="submit"
              disabled={!name.trim() || busy}
              className="min-h-11 flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={onDone}
              className="min-h-11 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}