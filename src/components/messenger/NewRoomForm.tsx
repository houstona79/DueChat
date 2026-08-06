import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createRoom } from "@/lib/chat";

export function NewRoomForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const room = await createRoom(userId, name, topic);
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
    <form onSubmit={submit} className="mt-3 rounded-2xl bg-secondary p-3">
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
        className="mt-1 w-full rounded-xl bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
      />
      <label className="mt-2 block text-[11px] font-medium text-muted-foreground" htmlFor="room-topic">
        Topic (optional)
      </label>
      <input
        id="room-topic"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        maxLength={120}
        placeholder="Weekly reviews"
        className="mt-1 w-full rounded-xl bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
      />
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create room"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-background"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
