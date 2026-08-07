import { Circle, Clock, Quote } from "lucide-react";
import type { Profile } from "@/lib/chat";
import { formatTime, isOnline } from "@/lib/chat";
import { cn } from "@/lib/utils";

/** Social status block: what someone is up to plus their live presence. */
export function SocialStatus({ profile }: { profile: Profile }) {
  const online = isOnline(profile);

  return (
    <section
      aria-label="Social status"
      className="rounded-2xl border border-border bg-secondary/50 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Social status
        </h3>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            online ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Circle
            className={cn("size-2", online ? "fill-current" : "fill-muted-foreground/60")}
            aria-hidden
          />
          {online ? "Online now" : "Offline"}
        </span>
      </div>

      <p className="mt-2 flex items-start gap-2 text-sm">
        <Quote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className={cn(!profile.status_message && "text-muted-foreground")}>
          {profile.status_message || "No status set"}
        </span>
      </p>

      <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="size-3.5 shrink-0" aria-hidden />
        {online ? "Active right now" : `Last seen ${formatTime(profile.last_seen_at)}`}
      </p>
    </section>
  );
}
