import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Download, Loader2, ScrollText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchMessageLogs, groupLogs, logsToText } from "@/lib/message-logs";
import { runMidnightClear } from "@/lib/message-logs.functions";
import { formatTime } from "@/lib/chat";

/** Archived chat history: every night at midnight rooms are cleared into here. */
export function ChatLogs({ canClear }: { canClear: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const logs = useQuery({ queryKey: ["admin-message-logs"], queryFn: () => fetchMessageLogs() });
  const clearNow = useServerFn(runMidnightClear);

  const nights = useMemo(() => groupLogs(logs.data ?? []), [logs.data]);

  const clearMutation = useMutation({
    mutationFn: () => clearNow({ data: undefined as never }),
    onSuccess: (res) => {
      toast.success(`Archived ${res.archived} messages and cleared the rooms.`);
      void logs.refetch();
    },
    onError: () => toast.error("Could not run the cleanup."),
  });

  const download = (night: string) => {
    const entries = (logs.data ?? []).filter((l) => l.archived_at.slice(0, 10) === night);
    const blob = new Blob([logsToText([...entries].reverse())], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `duechat-chat-log-${night}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mt-5 space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <ScrollText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Nightly chat logs</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              All room chats are wiped automatically at midnight (Eastern) and saved here for 90
              days.
            </p>
          </div>
        </div>
        {canClear && (
          <button
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
          >
            {clearMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Clear all chats now
          </button>
        )}
      </div>

      {logs.isLoading && <p className="text-sm text-muted-foreground">Loading logs…</p>}
      {logs.error && <p className="text-sm text-destructive">Could not load the chat logs.</p>}
      {!logs.isLoading && nights.length === 0 && (
        <p className="text-sm text-muted-foreground">No archived chats yet.</p>
      )}

      {nights.map((n) => (
        <div key={n.night} className="rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <button
              onClick={() => setOpen(open === n.night ? null : n.night)}
              aria-expanded={open === n.night}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <ChevronDown
                className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                  open === n.night ? "rotate-0" : "-rotate-90"
                }`}
              />
              <span className="truncate text-sm font-medium">{n.night}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {n.rooms.reduce((sum, r) => sum + r.entries.length, 0)} messages
              </span>
            </button>
            <button
              onClick={() => download(n.night)}
              aria-label={`Download log for ${n.night}`}
              className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
            >
              <Download className="size-4" />
            </button>
          </div>

          {open === n.night && (
            <div className="space-y-3 border-t border-border px-3 py-3">
              {n.rooms.map((r) => (
                <div key={r.room}>
                  <p className="text-xs font-semibold text-muted-foreground">{r.room}</p>
                  <ul className="mt-1 space-y-1">
                    {r.entries.map((e) => (
                      <li key={e.id} className="text-sm">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(e.sent_at)} ·{" "}
                          {e.display_name ?? e.username ?? "unknown user"}
                        </span>
                        <p className="break-words">{e.body}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
