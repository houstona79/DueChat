import { Crown } from "lucide-react";
import { CROWN_LABEL, CROWN_SHORT, sortCrowns, type RoomCrown } from "@/lib/room-crowns";
import { cn } from "@/lib/utils";

const TONE: Record<RoomCrown["period"], string> = {
  month: "bg-primary/15 text-primary",
  week: "bg-staff/15 text-staff",
  day: "bg-secondary text-foreground",
};

/** Compact crown icons, for tight rows like the room list or chat header. */
export function RoomCrownMarks({ crowns, className }: { crowns: RoomCrown[]; className?: string }) {
  if (crowns.length === 0) return null;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-0.5", className)}>
      {sortCrowns(crowns).map((crown) => (
        <Crown
          key={crown.period}
          aria-label={CROWN_LABEL[crown.period]}
          title={CROWN_LABEL[crown.period]}
          className={cn(
            "size-3.5",
            crown.period === "month"
              ? "text-primary"
              : crown.period === "week"
                ? "text-staff"
                : "text-muted-foreground",
          )}
        />
      ))}
    </span>
  );
}

/** Labelled crown badges, for room profiles and the rooms directory. */
export function RoomCrownBadges({ crowns, className }: { crowns: RoomCrown[]; className?: string }) {
  if (crowns.length === 0) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {sortCrowns(crowns).map((crown) => (
        <span
          key={crown.period}
          title={`${CROWN_LABEL[crown.period]} · ${crown.join_count} join${crown.join_count === 1 ? "" : "s"}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            TONE[crown.period],
          )}
        >
          <Crown className="size-3" aria-hidden />
          {CROWN_SHORT[crown.period]}
        </span>
      ))}
    </span>
  );
}
