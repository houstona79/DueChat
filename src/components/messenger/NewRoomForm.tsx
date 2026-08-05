import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createThread } from "@/lib/messenger";

export function NewRoomForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [members, setMembers] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const thread = createThread(name, members);
    onDone();
    navigate({ to: "/t/$threadId", params: { threadId: thread.id } });
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
        placeholder="Design crit"
        className="mt-1 w-full rounded-xl bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
      />
      <label className="mt-2 block text-[11px] font-medium text-muted-foreground" htmlFor="room-members">
        Members (optional)
      </label>
      <input
        id="room-members"
        inputMode="numeric"
        value={members}
        onChange={(e) => setMembers(e.target.value.replace(/\D/g, ""))}
        placeholder="3"
        className="mt-1 w-full rounded-xl bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          Create room
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
