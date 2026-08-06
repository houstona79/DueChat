import { Link } from "@tanstack/react-router";
import { ArrowLeft, Phone, SendHorizonal, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "./Avatar";
import { CallOverlay } from "./CallOverlay";
import { useMessages } from "@/hooks/use-chat";
import {
  accentFor,
  formatTime,
  isOnline,
  joinRoom,
  sendMessage,
  type Membership,
  type Profile,
  type Room,
} from "@/lib/chat";
import { cn } from "@/lib/utils";

export function ChatPane({
  room,
  memberships,
  profiles,
  meId,
}: {
  room: Room;
  memberships: Membership[];
  profiles: Profile[];
  meId: string;
}) {
  const queryClient = useQueryClient();
  const members = memberships.filter((m) => m.room_id === room.id);
  const joined = members.some((m) => m.user_id === meId);
  const onlineCount = members.filter((m) =>
    profiles.some((p) => p.id === m.user_id && isOnline(p)),
  ).length;

  const [draft, setDraft] = useState("");
  const [call, setCall] = useState<"voice" | "video" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: messages = [], isLoading } = useMessages(room.id, joined);

  useEffect(() => {
    if (joined) inputRef.current?.focus();
  }, [room.id, joined]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, room.id]);

  const profileOf = (userId: string) => profiles.find((p) => p.id === userId);

  const submit = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    try {
      await sendMessage(room.id, meId, text);
      await queryClient.invalidateQueries({ queryKey: ["messages", room.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed to send.");
      setDraft(text);
    }
    inputRef.current?.focus();
  };

  const join = async () => {
    await joinRoom(room.id, meId);
    await queryClient.invalidateQueries({ queryKey: ["memberships"] });
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link
          to="/chat"
          className="-ml-1 grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary md:hidden"
          aria-label="Back to rooms"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar name={room.name} accent={accentFor(room.id)} online={onlineCount > 0} size="sm" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{room.name}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {members.length} {members.length === 1 ? "member" : "members"} · {onlineCount} online
            {room.topic ? ` · ${room.topic}` : ""}
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

      {call ? (
        <CallOverlay
          title={room.name}
          accent={accentFor(room.id)}
          mode={call}
          onEnd={() => setCall(null)}
        />
      ) : null}

      {joined ? (
        <>
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground">Loading messages…</p>
            ) : null}
            {!isLoading && messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                No messages yet — say hello.
              </p>
            ) : null}
            {messages.map((m, i) => {
              const mine = m.user_id === meId;
              const prev = messages[i - 1];
              const grouped = prev?.user_id === m.user_id;
              const author = profileOf(m.user_id);
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col",
                    mine ? "items-end" : "items-start",
                    grouped ? "mt-0.5" : "mt-4",
                  )}
                >
                  {!mine && !grouped ? (
                    <span className="mb-1 px-1 text-[11px] font-medium text-muted-foreground">
                      {author?.display_name ?? "Someone"}
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[78%] px-4 py-2.5 text-sm leading-relaxed",
                      mine
                        ? "rounded-3xl rounded-br-md bg-bubble-me text-bubble-me-foreground"
                        : "rounded-3xl rounded-bl-md bg-bubble-them text-bubble-them-foreground",
                    )}
                  >
                    {m.body}
                  </div>
                  <span className="mt-1 px-1 text-[10px] text-muted-foreground">
                    {formatTime(m.created_at)}
                  </span>
                </div>
              );
            })}
          </div>

          <footer className="border-t border-border px-3 py-3">
            {error ? <p className="px-2 pb-2 text-xs text-destructive">{error}</p> : null}
            <div className="flex items-end gap-2 rounded-2xl bg-secondary p-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submit();
                  }
                }}
                placeholder={`Message ${room.name}`}
                aria-label="Message"
                className="max-h-32 min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={() => void submit()}
                disabled={draft.trim().length === 0}
                aria-label="Send message"
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
              >
                <SendHorizonal className="size-4" />
              </button>
            </div>
          </footer>
        </>
      ) : (
        <div className="grid min-h-0 flex-1 place-items-center px-6 text-center">
          <div className="max-w-sm">
            <h3 className="text-lg font-semibold">Join {room.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Messages in this room are only visible to members.
            </p>
            <button
              onClick={() => void join()}
              className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Join room
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
