import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatTime } from "@/lib/chat";
import {
  deleteAnnouncement,
  expireAnnouncement,
  fetchAllAnnouncements,
  levelLabel,
  sendAnnouncement,
  type AlertLevel,
} from "@/lib/announcements";

const levels: AlertLevel[] = ["info", "warning", "critical"];
const windows: { label: string; hours: number | null }[] = [
  { label: "1 hour", hours: 1 },
  { label: "6 hours", hours: 6 },
  { label: "24 hours", hours: 24 },
  { label: "Until removed", hours: null },
];

/** Admin-only composer for site-wide alerts shown on every member's screen. */
export function AlertComposer() {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [level, setLevel] = useState<AlertLevel>("info");
  const [hours, setHours] = useState<number | null>(24);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: fetchAllAnnouncements,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    void queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
  };

  const send = useMutation({
    mutationFn: () => sendAnnouncement({ body, level, expiresInHours: hours }),
    onSuccess: () => {
      setBody("");
      toast.success("Alert broadcast to every member.");
      refresh();
    },
    onError: () => toast.error("Only admins can send system alerts."),
  });

  const end = useMutation({
    mutationFn: expireAnnouncement,
    onSuccess: () => {
      toast.success("Alert ended.");
      refresh();
    },
    onError: () => toast.error("Could not end that alert."),
  });

  const remove = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      toast.success("Alert deleted.");
      refresh();
    },
    onError: () => toast.error("Could not delete that alert."),
  });

  const now = Date.now();
  const isActive = (expires: string | null) => !expires || new Date(expires).getTime() > now;

  return (
    <section className="mt-5" aria-label="System alerts">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Megaphone className="size-4 text-muted-foreground" aria-hidden />
          Broadcast a system alert
        </h2>
        <label htmlFor="alert-body" className="sr-only">
          Alert message
        </label>
        <textarea
          id="alert-body"
          value={body}
          maxLength={500}
          rows={3}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Scheduled maintenance tonight at midnight…"
          className="mt-3 w-full resize-none rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />

        <fieldset className="mt-3">
          <legend className="text-xs text-muted-foreground">Severity</legend>
          <div className="mt-1.5 flex gap-1 rounded-xl bg-secondary p-1">
            {levels.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={level === l}
                onClick={() => setLevel(l)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                  level === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {levelLabel(l)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-3">
          <legend className="text-xs text-muted-foreground">Show for</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {windows.map((w) => (
              <button
                key={w.label}
                type="button"
                aria-pressed={hours === w.hours}
                onClick={() => setHours(w.hours)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                  hours === w.hours
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          disabled={!body.trim() || send.isPending}
          onClick={() => send.mutate()}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {send.isPending ? "Sending…" : "Send to all members"}
        </button>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Appears instantly at the top of every signed-in member's screen. Members can dismiss it
          for themselves.
        </p>
      </div>

      <h3 className="mt-5 text-sm font-semibold">Recent alerts</h3>
      {isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading alerts…</p>
      ) : alerts.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No system alerts have been sent yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm">{a.body}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {levelLabel(a.level)} · sent {formatTime(a.created_at)} ·{" "}
                  {isActive(a.expires_at) ? "showing now" : "ended"}
                </p>
              </div>
              {isActive(a.expires_at) && (
                <button
                  disabled={end.isPending}
                  onClick={() => end.mutate(a.id)}
                  className="shrink-0 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  End now
                </button>
              )}
              <button
                aria-label="Delete alert"
                disabled={remove.isPending}
                onClick={() => remove.mutate(a.id)}
                className="grid size-9 shrink-0 place-items-center rounded-xl text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}