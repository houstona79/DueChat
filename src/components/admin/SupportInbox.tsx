import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import {
  fetchSupportTickets,
  fetchTicketMessages,
  sendStaffMessage,
  setTicketStatus,
} from "@/lib/support";

/** Admin-only inbox for the home-page live support chats. */
export function SupportInbox() {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const tickets = useQuery({
    queryKey: ["support", "tickets"],
    queryFn: fetchSupportTickets,
    refetchInterval: 8000,
  });

  const messages = useQuery({
    queryKey: ["support", "tickets", openId],
    queryFn: () => fetchTicketMessages(openId!),
    enabled: Boolean(openId),
    refetchInterval: 5000,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.data?.length]);

  const reply = useMutation({
    mutationFn: (body: string) => sendStaffMessage(openId!, body),
    onSuccess: () => {
      setDraft("");
      void queryClient.invalidateQueries({ queryKey: ["support"] });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: (vars: { id: string; status: "open" | "closed" }) =>
      setTicketStatus(vars.id, vars.status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["support"] }),
  });

  if (tickets.isLoading) {
    return <p className="mt-5 text-sm text-muted-foreground">Loading support chats…</p>;
  }
  if (tickets.error) {
    return <p className="mt-5 text-sm text-destructive">Could not load support chats.</p>;
  }

  const list = tickets.data ?? [];
  const current = list.find((t) => t.id === openId) ?? null;

  if (current) {
    return (
      <div className="mt-5 rounded-2xl border border-border bg-card">
        <div className="flex items-start gap-3 border-b border-border p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{current.subject}</p>
            <p className="truncate text-xs text-muted-foreground">
              {current.guest_email
                ? `${current.guest_name ?? "Guest"} · ${current.guest_email}`
                : "Signed-in member"}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              toggleStatus.mutate({
                id: current.id,
                status: current.status === "open" ? "closed" : "open",
              })
            }
            className="shrink-0 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold"
          >
            {current.status === "open" ? "Close" : "Reopen"}
          </button>
          <button
            type="button"
            onClick={() => setOpenId(null)}
            className="shrink-0 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold"
          >
            Back
          </button>
        </div>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto p-4">
          {(messages.data ?? []).map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.from_staff ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p
                className={`mt-1 text-[10px] ${
                  m.from_staff ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {m.from_staff ? "You" : (m.sender_name ?? "Member")} ·{" "}
                {new Date(m.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form
          className="flex items-end gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const body = draft.trim();
            if (body && !reply.isPending) reply.mutate(body);
          }}
        >
          <label htmlFor="support-reply" className="sr-only">
            Reply to this support chat
          </label>
          <textarea
            id="support-reply"
            rows={1}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Reply as DueChat support"
            className="max-h-24 flex-1 resize-none rounded-xl bg-secondary px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
          />
          <button
            type="submit"
            disabled={reply.isPending || !draft.trim()}
            aria-label="Send reply"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="size-4" aria-hidden />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-2">
      {list.length === 0 && (
        <p className="text-sm text-muted-foreground">No support chats yet.</p>
      )}
      {list.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setOpenId(t.id)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{t.subject}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {t.guest_email ? `${t.guest_name ?? "Guest"} · ${t.guest_email}` : "Member"} ·{" "}
              {new Date(t.last_message_at).toLocaleString()}
            </span>
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              t.status === "open" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
            }`}
          >
            {t.status}
          </span>
        </button>
      ))}
    </div>
  );
}