import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createRoom,
  setRoomRating,
  ROOM_RATING_LABEL,
  ROOM_CATEGORIES,
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

export function NewRoomForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState<RoomRating>("G");
  const [category, setCategory] = useState<string>("General");
  const [invisible, setInvisible] = useState(false);
  const [lockCode, setLockCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const room = await createRoom(userId, name, topic, category, {
        invisible,
        lockCode: lockCode.trim() || null,
        description: description.trim() || null,
      });
      if (rating !== "G") await setRoomRating(room.id, rating);
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
      onDone();
      void navigate({ to: "/chat/$roomId", params: { roomId: room.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the room.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onDone(); }}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg md:max-w-2xl landscape-short:max-h-[96dvh] landscape-short:w-[calc(100vw-2rem)] landscape-short:max-w-3xl">
        <DialogHeader className="border-b px-4 py-3 text-left landscape-short:py-2">
          <DialogTitle className="text-base">Create a room</DialogTitle>
          <DialogDescription className="text-xs landscape-short:hidden">
            Set the name, audience and privacy for your new room.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 landscape-short:py-2">
      <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="room-name">
        Room name
      </label>
      <input
        id="room-name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        placeholder="Design crit"
        className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
      />
      <label
        className="mt-2 block text-[11px] font-medium text-muted-foreground"
        htmlFor="room-topic"
      >
        Topic (optional)
      </label>
      <input
        id="room-topic"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        maxLength={120}
        placeholder="Weekly reviews"
        className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
      />
      <label
        className="mt-2 block text-[11px] font-medium text-muted-foreground"
        htmlFor="room-description"
      >
        Description (optional)
      </label>
      <textarea
        id="room-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={200}
        rows={2}
        placeholder="What is this room about? Shown on the browse page."
        className="mt-1 w-full resize-none rounded-xl bg-secondary px-3 py-2 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
      />
      <label
        className="mt-2 block text-[11px] font-medium text-muted-foreground"
        htmlFor="room-category"
      >
        Category
      </label>
      <select
        id="room-category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-base outline-none sm:text-sm"
      >
        {ROOM_CATEGORIES.map((c) => (
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
            Hidden from the room list — only you, members and people you invite can see it.
          </span>
        </span>
      </label>
      <label
        className="mt-2 block text-[11px] font-medium text-muted-foreground"
        htmlFor="room-lock-code"
      >
        Entry code (optional)
      </label>
      <input
        id="room-lock-code"
        value={lockCode}
        onChange={(e) => setLockCode(e.target.value)}
        maxLength={40}
        autoComplete="off"
        placeholder="Leave blank for an open room"
        className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        A locked room still appears in the list, but people need this code to get in.
      </p>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
          </div>
          <div className="flex gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="min-h-11 flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create room"}
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
