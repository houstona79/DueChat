import { Link } from "@tanstack/react-router";
import { ArrowLeft, Phone, SendHorizonal, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { CallOverlay } from "./CallOverlay";
import { formatTime, sendMessage, type Thread } from "@/lib/messenger";
import { cn } from "@/lib/utils";

export function ChatPane({ thread }: { thread: Thread }) {
  const [draft, setDraft] = useState("");
  const [call, setCall] = useState<"voice" | "video" | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [thread.id]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.messages.length, thread.id]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    sendMessage(thread.id, text);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link
          to="/"
          className="-ml-1 grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary md:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar name={thread.name} accent={thread.accent} online={thread.online} size="sm" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{thread.name}</h2>
          <p className="text-xs text-muted-foreground">
            {thread.online ? "Active now" : "Offline"} · {thread.handle}
          </p>
        </div>
        <button
          onClick={() => setCall("voice")}
          className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
          aria-label="Start voice call"
        >
          <Phone className="size-4" />
        </button>
        <button
          onClick={() => setCall("video")}
          className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
          aria-label="Start video call"
        >
          <Video className="size-4" />
        </button>
      </header>

      {call ? <CallOverlay thread={thread} mode={call} onEnd={() => setCall(null)} /> : null}

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {thread.messages.map((m, i) => {
          const prev = thread.messages[i - 1];
          const grouped = prev?.author === m.author;
          return (
            <div
              key={m.id}
              className={cn(
                "flex flex-col",
                m.author === "me" ? "items-end" : "items-start",
                grouped ? "mt-0.5" : "mt-4",
              )}
            >
              <div
                className={cn(
                  "max-w-[78%] px-4 py-2.5 text-sm leading-relaxed",
                  m.author === "me"
                    ? "rounded-3xl rounded-br-md bg-bubble-me text-bubble-me-foreground"
                    : "rounded-3xl rounded-bl-md bg-bubble-them text-bubble-them-foreground",
                )}
              >
                {m.text}
              </div>
              <span className="mt-1 px-1 text-[10px] text-muted-foreground">
                {formatTime(m.at)}
              </span>
            </div>
          );
        })}
      </div>

      <footer className="border-t border-border px-3 py-3">
        <div className="flex items-end gap-2 rounded-2xl bg-secondary p-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={`Message ${thread.name.split(" ")[0]}`}
            aria-label="Message"
            className="max-h-32 min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={submit}
            disabled={draft.trim().length === 0}
            aria-label="Send message"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <SendHorizonal className="size-4" />
          </button>
        </div>
      </footer>
    </section>
  );
}