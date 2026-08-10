import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMessages, useProfiles } from "@/hooks/use-chat";
import { accentFor, formatTime, sendMessage } from "@/lib/chat";
import { Avatar } from "./Avatar";
import { EmojiPicker } from "./EmojiPicker";
import { GifPicker } from "./GifPicker";

function isEmojiOnly(body: string) {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 12) return false;
  return /^[\p{Extended_Pictographic}\uFE0F\u200D\s\u{1F3FB}-\u{1F3FF}\u{20E3}]+$/u.test(trimmed);
}

function gifUrlOf(body: string) {
  const trimmed = body.trim();
  if (!/^https:\/\/\S+$/i.test(trimmed) || /\s/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (!url.hostname.endsWith("klipy.com") && !url.hostname.endsWith("klipy.co")) return null;
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Compact chat transcript + composer shown as an overlay panel during a
 * group call, so people can keep talking in text without leaving the call.
 */
export function CallChat({
  roomId,
  meId,
  onClose,
}: {
  roomId: string;
  meId: string;
  onClose: () => void;
}) {
  const { data: messages = [] } = useMessages(roomId, true);
  const { data: profiles = [] } = useProfiles();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const visible = messages.filter(
    (m) => !m.body.startsWith("::live::") && !m.body.startsWith("::gift::"),
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [visible.length]);

  const nameFor = (id: string) =>
    profiles.find((p) => p.id === id)?.display_name ?? "Member";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    try {
      await sendMessage(roomId, meId, body);
      await queryClient.invalidateQueries({ queryKey: ["messages", roomId] });
    } finally {
      setSending(false);
    }
  };

  const sendMedia = (url: string) => {
    void (async () => {
      try {
        await sendMessage(roomId, meId, url);
        await queryClient.invalidateQueries({ queryKey: ["messages", roomId] });
      } catch {
        /* ignore — transcript stays unchanged on failure */
      }
    })();
  };

  return (
    <aside
      aria-label="Call chat"
      className="pointer-events-auto flex max-h-[55vh] w-full flex-col overflow-hidden rounded-3xl border border-border bg-sidebar/95 shadow-xl backdrop-blur-sm sm:max-h-none sm:h-full sm:w-80 sm:rounded-2xl"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Chat
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide call chat"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground">No messages yet.</p>
        ) : (
          visible.slice(-60).map((m) => (
            <div key={m.id} className="flex items-start gap-2">
              <Avatar name={nameFor(m.user_id)} accent={accentFor(m.user_id)} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="truncate font-medium text-foreground">
                    {m.user_id === meId ? "You" : nameFor(m.user_id)}
                  </span>
                  {formatTime(m.created_at)}
                </p>
                {gifUrlOf(m.body) ? (
                  <img
                    src={gifUrlOf(m.body)!}
                    alt={`GIF sent by ${m.user_id === meId ? "you" : nameFor(m.user_id)}`}
                    loading="lazy"
                    className="mt-1 max-h-40 w-auto max-w-full rounded-xl border border-border object-contain"
                  />
                ) : (
                  <p
                    className={
                      isEmojiOnly(m.body)
                        ? "break-words text-2xl leading-tight"
                        : "break-words text-xs leading-relaxed"
                    }
                  >
                    {m.body}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex shrink-0 items-center gap-1 border-t border-border p-2">
        <EmojiPicker
          onSelect={(emoji) => {
            const el = inputRef.current;
            if (!el) {
              setDraft((d) => d + emoji);
              return;
            }
            const start = el.selectionStart ?? el.value.length;
            const end = el.selectionEnd ?? start;
            const next = el.value.slice(0, start) + emoji + el.value.slice(end);
            setDraft(next.slice(0, 2000));
            requestAnimationFrame(() => {
              el.focus();
              const caret = start + emoji.length;
              el.setSelectionRange(caret, caret);
            });
          }}
        />
        <GifPicker onSelect={sendMedia} />
        <GifPicker media="stickers" onSelect={sendMedia} />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the room…"
          aria-label="Message the room"
          className="min-w-0 flex-1 rounded-xl bg-secondary px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label="Send message"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </form>
    </aside>
  );
}