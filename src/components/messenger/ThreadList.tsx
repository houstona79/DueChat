import { Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Avatar } from "./Avatar";
import { NewRoomForm } from "./NewRoomForm";
import { formatTime, lastMessage, type Thread } from "@/lib/messenger";
import { cn } from "@/lib/utils";

export function ThreadList({
  threads,
  activeId,
}: {
  threads: Thread[];
  activeId?: string | undefined;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const filtered = threads.filter((t) =>
    (t.name + t.handle).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <header className="px-5 pb-3 pt-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Messages</h1>
          <button
            onClick={() => setCreating((v) => !v)}
            aria-label="Create chat room"
            className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        {creating ? <NewRoomForm onDone={() => setCreating(false)} /> : null}
      </header>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {filtered.map((thread) => {
          const last = lastMessage(thread);
          return (
            <Link
              key={thread.id}
              to="/t/$threadId"
              params={{ threadId: thread.id }}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors",
                thread.id === activeId ? "bg-accent" : "hover:bg-secondary",
              )}
            >
              <Avatar name={thread.name} accent={thread.accent} online={thread.online} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{thread.name}</span>
                  {last ? (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatTime(last.at)}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {last ? (last.author === "me" ? "You: " : "") + last.text : "No messages yet"}
                </span>
              </span>
            </Link>
          );
        })}
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No matches.</p>
        ) : null}
      </nav>
    </div>
  );
}